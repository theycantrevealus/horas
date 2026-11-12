import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { EmployeeManagementModule } from '../employee/employee-management.module'
import { OrganizationManagementModule } from '../organization/organization-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { ContractManagementModule } from './contract-management.module'

describe('contract endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let terminatorToken: string
  let statusToken: string
  let otherTenantToken: string
  let organizationId: string
  let counter = 0

  /**
   * Today's date in UTC, as the server reads it.
   *
   * @param days - Days to add.
   * @returns The date as `YYYY-MM-DD`.
   */
  function day(days = 0): string {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
  }

  /**
   * Adds a platform-wide code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param properties - Concept properties.
   * @param status - Concept status.
   */
  async function addConcept(
    system: string,
    code: string,
    properties: Record<string, unknown> = {},
    status: 'active' | 'retired' = 'active',
  ) {
    await workforce.codeConcepts.create({
      system,
      code,
      display: [{ locale: 'en', text: code }],
      properties,
      mappings: [],
      period: null,
      status,
    })
  }

  /**
   * Registers an employee through the API.
   *
   * @param token - Token of the caller.
   * @returns The employee identifier.
   */
  async function registerEmployee(token = writerToken): Promise<string> {
    counter += 1
    const reply = await call('POST', '/v1/employees', token, {
      employeeNumber: `rs-${counter}`,
      name: { text: `Pegawai ${counter}` },
      workforceCategory: {
        system: 'id.workforce-category',
        code: 'non_klinis',
      },
      hireDate: '2026-01-05',
    })
    expect(reply.status).toBe(201)
    return (reply.body as Record<string, any>).id
  }

  /**
   * Creates a draft through the API as the writer; the defaults make an open-ended permanent one.
   *
   * @param employeeId - Employee of the contract.
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function createContract(employeeId: string, override: object = {}) {
    counter += 1
    return call('POST', '/v1/contracts', writerToken, {
      employeeId,
      organizationId,
      contractNumber: `pkwtt/${counter}`,
      employmentType: { system: 'id.employment-type', code: 'pkwtt' },
      period: { start: '2026-01-05' },
      ...override,
    })
  }

  /**
   * Creates a draft and expects success.
   *
   * @param employeeId - Employee of the contract.
   * @param override - Fields that replace the defaults.
   * @returns The draft.
   */
  async function draft(
    employeeId: string,
    override: object = {},
  ): Promise<Record<string, any>> {
    const reply = await createContract(employeeId, override)
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  /**
   * Creates and activates a contract.
   *
   * @param employeeId - Employee of the contract.
   * @param override - Fields that replace the defaults.
   * @returns The active contract.
   */
  async function active(
    employeeId: string,
    override: object = {},
  ): Promise<Record<string, any>> {
    const created = await draft(employeeId, override)
    const reply = await call(
      'POST',
      `/v1/contracts/${created.id}/activate`,
      writerToken,
      {},
    )
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

  /**
   * Captures every entry the application writes through Nest's logger.
   *
   * @returns The entries and a function that restores the logger.
   */
  function captureLogs(): {
    written: Record<string, unknown>[]
    restore: () => void
  } {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [
        OrganizationManagementModule,
        EmployeeManagementModule,
        ContractManagementModule,
      ],
      ...workforce.options,
    })
    call = gateway.call
    const { tenantId, otherTenantId, seedAndLogin } = gateway
    writerToken = await seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
      PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE,
      PERMISSIONS.WORKFORCE_CONTRACT_READ,
      PERMISSIONS.WORKFORCE_CONTRACT_WRITE,
    ])
    readerToken = await seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_CONTRACT_READ,
    ])
    terminatorToken = await seedAndLogin(tenantId, 'terminator', [
      PERMISSIONS.WORKFORCE_CONTRACT_TERMINATE,
    ])
    statusToken = await seedAndLogin(tenantId, 'status', [
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
      PERMISSIONS.WORKFORCE_EMPLOYEE_STATUS,
    ])
    otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', [
      PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
      PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
      PERMISSIONS.WORKFORCE_EMPLOYEE_READ,
      PERMISSIONS.WORKFORCE_EMPLOYEE_WRITE,
      PERMISSIONS.WORKFORCE_CONTRACT_READ,
      PERMISSIONS.WORKFORCE_CONTRACT_WRITE,
      PERMISSIONS.WORKFORCE_CONTRACT_TERMINATE,
    ])
    await addConcept('id.workforce-category', 'non_klinis', {
      is_clinical: false,
    })
    await addConcept('id.employment-type', 'pkwtt', {
      allows_probation: true,
      requires_end_date: false,
    })
    await addConcept('id.employment-type', 'pkwt', {
      allows_probation: false,
      requires_end_date: true,
    })
    await addConcept('id.employment-type', 'lama', {}, 'retired')
    await addConcept('id.working-time-scheme', 'shift_40')
    await addConcept('id.termination-reason', 'resigned')
    const organization = await call('POST', '/v1/organizations', writerToken, {
      code: 'rs-group',
      legalName: 'PT RS Group',
      country: 'ID',
      currency: 'IDR',
    })
    organizationId = (organization.body as Record<string, any>).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', `/v1/employees/${id}/contracts`, undefined],
      ['POST', '/v1/contracts', {}],
      ['GET', `/v1/contracts/${id}`, undefined],
      ['PATCH', `/v1/contracts/${id}`, {}],
      ['POST', `/v1/contracts/${id}/activate`, {}],
      ['POST', `/v1/contracts/${id}/end`, {}],
      ['POST', `/v1/contracts/${id}/terminate`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(
      ([method, url]) => method !== 'GET' && !url.endsWith('/terminate'),
    )) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect(
      (await call('POST', `/v1/contracts/${id}/terminate`, writerToken, {}))
        .status,
    ).toBe(403)
    expect(
      (await call('POST', '/v1/contracts', terminatorToken, {})).status,
    ).toBe(403)
    expect(
      (await call('GET', `/v1/contracts/${id}`, terminatorToken)).status,
    ).toBe(403)
  })

  it('creates, reads, lists and corrects a contract', async () => {
    const employeeId = await registerEmployee()
    const created = await draft(employeeId, {
      contractNumber: ' pkwtt/2026-001 ',
      probationEndDate: '2026-04-05',
      fte: 0.5,
      workingTimeScheme: { system: 'id.working-time-scheme', code: 'shift_40' },
    })
    expect(created).toMatchObject({
      employee_id: employeeId,
      organization_id: organizationId,
      contract_number: 'PKWTT/2026-001',
      period: { start: '2026-01-05', end: null },
      probation_end_date: '2026-04-05',
      fte: 0.5,
      status: 'draft',
      termination: null,
      document: null,
    })
    expect(created).not.toHaveProperty('_id')

    const read = await call('GET', `/v1/contracts/${created.id}`, readerToken)
    expect(read.status).toBe(200)
    const list = await call(
      'GET',
      `/v1/employees/${employeeId}/contracts`,
      readerToken,
    )
    expect(list.status).toBe(200)
    expect(list.body).toHaveLength(1)

    const edited = await call(
      'PATCH',
      `/v1/contracts/${created.id}`,
      writerToken,
      {
        fte: 1,
        probationEndDate: null,
        reason: 'Typo',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      fte: 1,
      probation_end_date: null,
      version: created.version + 1,
    })
  })

  it('answers 404 contract_not_found for malformed, missing and foreign ids on every id route', async () => {
    const employeeId = await registerEmployee()
    const created = await draft(employeeId)
    const missing = new Types.ObjectId().toHexString()

    for (const id of ['missing-id', missing]) {
      expect(
        (await call('GET', `/v1/contracts/${id}`, readerToken)).body,
      ).toMatchObject({ code: 'contract_not_found' })
    }
    const replies = await Promise.all([
      call('GET', `/v1/contracts/${created.id}`, otherTenantToken),
      call('PATCH', `/v1/contracts/${created.id}`, otherTenantToken, {
        fte: 0.5,
      }),
      call(
        'POST',
        `/v1/contracts/${created.id}/activate`,
        otherTenantToken,
        {},
      ),
      call('POST', `/v1/contracts/${created.id}/end`, otherTenantToken, {}),
      call('POST', `/v1/contracts/${created.id}/terminate`, otherTenantToken, {
        date: day(),
        reason: { system: 'id.termination-reason', code: 'resigned' },
      }),
      call('PATCH', '/v1/contracts/missing-id', writerToken, { fte: 0.5 }),
    ])
    for (const reply of replies) {
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'contract_not_found' })
    }
  })

  it('lists the contracts of an employee newest first, empty for a foreign employee, and 400 for a malformed id', async () => {
    const employeeId = await registerEmployee()
    const first = await active(employeeId, {
      employmentType: { system: 'id.employment-type', code: 'pkwt' },
      period: { start: '2026-01-05', end: day(-1) },
    })
    await call('POST', `/v1/contracts/${first.id}/end`, writerToken, {})
    await draft(employeeId, { period: { start: '2026-02-05' } })

    const list = await call(
      'GET',
      `/v1/employees/${employeeId}/contracts`,
      readerToken,
    )

    expect(
      list.body?.map(
        (item: { period: { start: string } }) => item.period.start,
      ),
    ).toEqual(['2026-02-05', '2026-01-05'])
    expect(
      (
        await call(
          'GET',
          `/v1/employees/${employeeId}/contracts`,
          otherTenantToken,
        )
      ).body,
    ).toEqual([])
    expect(
      (await call('GET', '/v1/employees/not-an-id/contracts', readerToken))
        .status,
    ).toBe(400)
  })

  it('answers 422 for employee, employer, type and date rules the DTO cannot judge', async () => {
    const employeeId = await registerEmployee()
    const foreignEmployee = await registerEmployee(otherTenantToken)
    const cases: [object, string][] = [
      [{ contractNumber: 'A B' }, 'invalid_contract_number'],
      [{ fte: 0 }, 'invalid_fte'],
      [{ fte: 1.5 }, 'invalid_fte'],
      [
        { employmentType: { system: 'id.bank', code: 'x' } },
        'invalid_employment_type',
      ],
      [
        { employmentType: { system: 'id.employment-type', code: 'nope' } },
        'unknown_code',
      ],
      [
        { employmentType: { system: 'id.employment-type', code: 'lama' } },
        'code_retired',
      ],
      [
        { employmentType: { system: 'id.employment-type', code: 'pkwt' } },
        'end_date_required',
      ],
      [
        { period: { start: '2026-02-01', end: '2026-01-01' } },
        'invalid_period',
      ],
      [{ probationEndDate: '2025-12-31' }, 'invalid_probation_date'],
      [
        {
          employmentType: { system: 'id.employment-type', code: 'pkwt' },
          period: { start: '2026-01-05', end: '2026-12-31' },
          probationEndDate: '2026-02-01',
        },
        'probation_not_allowed',
      ],
      [
        {
          workingTimeScheme: { system: 'id.working-time-scheme', code: 'nope' },
        },
        'unknown_code',
      ],
      [
        { employeeId: new Types.ObjectId().toHexString() },
        'employee_not_found',
      ],
      [{ employeeId: foreignEmployee }, 'employee_not_found'],
      [
        { organizationId: new Types.ObjectId().toHexString() },
        'organization_not_found',
      ],
    ]
    for (const [override, code] of cases) {
      const reply = await createContract(employeeId, override)
      expect([
        JSON.stringify(override),
        reply.status,
        reply.body?.code,
      ]).toEqual([JSON.stringify(override), 422, code])
    }
  })

  it('answers 400 for a malformed body', async () => {
    const employeeId = await registerEmployee()
    const base = {
      employeeId,
      organizationId,
      contractNumber: 'valid-1',
      employmentType: { system: 'id.employment-type', code: 'pkwtt' },
      period: { start: '2026-01-05' },
    }
    for (const bad of [
      {},
      { ...base, employeeId: 'nope' },
      { ...base, organizationId: undefined },
      { ...base, employmentType: undefined },
      { ...base, period: undefined },
      { ...base, period: { start: '2026-02-30' } },
      { ...base, fte: '1' },
      { ...base, probationEndDate: 'soon' },
      { ...base, previousContractId: 'nope' },
    ]) {
      const reply = await call('POST', '/v1/contracts', writerToken, bad)
      expect([JSON.stringify(bad), reply.status]).toEqual([
        JSON.stringify(bad),
        400,
      ])
    }
  })

  it('answers 409 for a duplicate number, a second active contract, a second renewal and a stale version', async () => {
    const employeeId = await registerEmployee()
    const first = await draft(employeeId, { contractNumber: 'dup-1' })

    const same = await createContract(employeeId, { contractNumber: 'DUP-1' })
    expect(same.status).toBe(409)
    expect(same.body).toMatchObject({ code: 'contract_exists' })

    await call('POST', `/v1/contracts/${first.id}/activate`, writerToken, {})
    const second = await draft(employeeId, { period: { start: '2026-02-05' } })
    const blocked = await call(
      'POST',
      `/v1/contracts/${second.id}/activate`,
      writerToken,
      {},
    )
    expect(blocked.status).toBe(409)
    expect(blocked.body).toMatchObject({ code: 'active_contract_exists' })

    const renewal = await createContract(employeeId, {
      previousContractId: first.id,
      period: { start: '2026-03-01' },
    })
    expect(renewal.status).toBe(201)
    const again = await createContract(employeeId, {
      previousContractId: first.id,
      period: { start: '2026-03-02' },
    })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'contract_already_renewed' })

    const stale = await call(
      'PATCH',
      `/v1/contracts/${second.id}`,
      writerToken,
      {
        fte: 0.5,
        version: second.version + 5,
      },
    )
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
  })

  it('ignores the employee, employer and number in a PATCH, and answers 422 for an empty update and an active contract', async () => {
    const employeeId = await registerEmployee()
    const created = await draft(employeeId, { contractNumber: 'patch-1' })

    const ignored = await call(
      'PATCH',
      `/v1/contracts/${created.id}`,
      writerToken,
      {
        fte: 0.5,
        employeeId: new Types.ObjectId().toHexString(),
        organizationId: new Types.ObjectId().toHexString(),
        contractNumber: 'HACKED',
        status: 'active',
      },
    )
    expect(ignored.body).toMatchObject({
      employee_id: employeeId,
      organization_id: organizationId,
      contract_number: 'PATCH-1',
      status: 'draft',
      fte: 0.5,
    })
    const empty = await call(
      'PATCH',
      `/v1/contracts/${created.id}`,
      writerToken,
      {
        contractNumber: 'X',
      },
    )
    expect(empty.body).toMatchObject({ code: 'empty_update' })

    await call('POST', `/v1/contracts/${created.id}/activate`, writerToken, {})
    const late = await call(
      'PATCH',
      `/v1/contracts/${created.id}`,
      writerToken,
      { fte: 1 },
    )
    expect(late.status).toBe(422)
    expect(late.body).toMatchObject({ code: 'contract_not_draft' })
  })

  it('activates a contract, sets the employee summary, and lets the employee leave onboarding only then', async () => {
    const employeeId = await registerEmployee()
    const status = (to: string) =>
      call('POST', `/v1/employees/${employeeId}/status`, statusToken, {
        status: to,
      })

    const before = await status('probation')
    expect(before.status).toBe(422)
    expect(before.body).toMatchObject({ code: 'contract_required' })

    const contract = await active(employeeId, {
      period: { start: '2026-01-05' },
    })
    expect(contract.status).toBe('active')
    const employee = await call(
      'GET',
      `/v1/employees/${employeeId}`,
      statusToken,
    )
    expect(employee.body?.current_employment).toEqual({
      contract_id: contract.id,
      organization_id: organizationId,
      employment_type: { system: 'id.employment-type', code: 'pkwtt' },
      start_date: '2026-01-05',
    })

    expect((await status('probation')).body).toMatchObject({
      employment_status: 'probation',
    })
  })

  it('refuses probation on a type that does not allow it, but allows active', async () => {
    const employeeId = await registerEmployee()
    await active(employeeId, {
      employmentType: { system: 'id.employment-type', code: 'pkwt' },
      period: { start: '2026-01-05', end: '2026-12-31' },
    })
    const status = (to: string) =>
      call('POST', `/v1/employees/${employeeId}/status`, statusToken, {
        status: to,
      })

    const probation = await status('probation')
    expect(probation.status).toBe(422)
    expect(probation.body).toMatchObject({ code: 'probation_not_allowed' })
    expect((await status('active')).status).toBe(201)
  })

  it('supersedes the old contract when its renewal is activated, and moves the summary', async () => {
    const employeeId = await registerEmployee()
    const first = await active(employeeId, {
      employmentType: { system: 'id.employment-type', code: 'pkwt' },
      period: { start: '2026-01-05', end: '2026-12-31' },
    })
    const renewal = await draft(employeeId, {
      previousContractId: first.id,
      period: { start: '2026-03-01' },
    })

    const activated = await call(
      'POST',
      `/v1/contracts/${renewal.id}/activate`,
      writerToken,
      {},
    )

    expect(activated.body).toMatchObject({ status: 'active' })
    expect(
      (await call('GET', `/v1/contracts/${first.id}`, readerToken)).body,
    ).toMatchObject({ status: 'superseded' })
    expect(
      (await call('GET', `/v1/employees/${employeeId}`, statusToken)).body
        ?.current_employment,
    ).toMatchObject({ contract_id: renewal.id })
  })

  it('answers 422 for a contract that starts later than tomorrow, and for activating anything but a draft', async () => {
    const employeeId = await registerEmployee()
    const future = await draft(employeeId, { period: { start: day(10) } })

    const early = await call(
      'POST',
      `/v1/contracts/${future.id}/activate`,
      writerToken,
      {},
    )
    expect(early.status).toBe(422)
    expect(early.body).toMatchObject({ code: 'contract_not_started' })

    const live = await active(await registerEmployee())
    const again = await call(
      'POST',
      `/v1/contracts/${live.id}/activate`,
      writerToken,
      {},
    )
    expect(again.body).toMatchObject({ code: 'contract_not_draft' })
  })

  it('ends a contract that reached its end date and clears the summary without changing the status', async () => {
    const employeeId = await registerEmployee()
    const contract = await active(employeeId, {
      employmentType: { system: 'id.employment-type', code: 'pkwt' },
      period: { start: '2026-01-05', end: day(1) },
    })

    const ended = await call(
      'POST',
      `/v1/contracts/${contract.id}/end`,
      writerToken,
      {
        reason: 'Expired',
      },
    )

    expect(ended.status).toBe(201)
    expect(ended.body).toMatchObject({ status: 'ended' })
    const employee = await call(
      'GET',
      `/v1/employees/${employeeId}`,
      statusToken,
    )
    expect(employee.body).toMatchObject({
      current_employment: null,
      employment_status: 'onboarding',
    })
    const again = await call(
      'POST',
      `/v1/contracts/${contract.id}/end`,
      writerToken,
      {},
    )
    expect(again.body).toMatchObject({ code: 'contract_not_active' })
  })

  it('refuses to end a contract with no end date or a future end date', async () => {
    const open = await active(await registerEmployee())
    const future = await active(await registerEmployee(), {
      employmentType: { system: 'id.employment-type', code: 'pkwt' },
      period: { start: '2026-01-05', end: day(10) },
    })

    for (const id of [open.id, future.id]) {
      const reply = await call(
        'POST',
        `/v1/contracts/${id}/end`,
        writerToken,
        {},
      )
      expect([reply.status, reply.body?.code]).toEqual([
        422,
        'contract_end_not_reached',
      ])
    }
  })

  it('terminates a contract early with its own permission, and keeps the contract period', async () => {
    const employeeId = await registerEmployee()
    const contract = await active(employeeId, {
      period: { start: '2026-01-05' },
    })
    const reason = { system: 'id.termination-reason', code: 'resigned' }

    const bad = await call(
      'POST',
      `/v1/contracts/${contract.id}/terminate`,
      terminatorToken,
      {
        date: '2026-01-04',
        reason,
      },
    )
    expect(bad.body).toMatchObject({ code: 'invalid_termination_date' })
    const terminated = await call(
      'POST',
      `/v1/contracts/${contract.id}/terminate`,
      terminatorToken,
      { date: day(), reason, notes: 'Moved abroad' },
    )

    expect(terminated.status).toBe(201)
    expect(terminated.body).toMatchObject({
      status: 'terminated',
      termination: {
        date: day(),
        reason: { code: 'resigned' },
        notes: 'Moved abroad',
      },
      period: { start: '2026-01-05', end: null },
    })
    expect(
      (await call('GET', `/v1/employees/${employeeId}`, statusToken)).body,
    ).toMatchObject({ current_employment: null })
    for (const body of [
      { date: day(), reason: { system: 'id.bank', code: 'x' } },
      {
        date: day(),
        reason: { system: 'id.termination-reason', code: 'nope' },
      },
    ]) {
      const other = await active(await registerEmployee())
      const reply = await call(
        'POST',
        `/v1/contracts/${other.id}/terminate`,
        terminatorToken,
        body,
      )
      expect(reply.status).toBe(422)
    }
    expect(
      (
        await call(
          'POST',
          `/v1/contracts/${contract.id}/terminate`,
          terminatorToken,
          {
            date: 'soon',
            reason,
          },
        )
      ).status,
    ).toBe(400)
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const employeeId = await registerEmployee()
    const created = await draft(employeeId)
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/contracts/${created.id}`, readerToken),
        await call('GET', `/v1/employees/${employeeId}/contracts`, readerToken),
        await call('GET', '/v1/contracts/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual(
        [],
      )
    } finally {
      restore()
    }
  })

  it("logs one entry per write, without the contract's values", async () => {
    const employeeId = await registerEmployee()
    const { written, restore } = captureLogs()
    try {
      const created = await createContract(employeeId, {
        contractNumber: 'log-check-9',
      })
      await call(
        'POST',
        `/v1/contracts/${created.body?.id}/activate`,
        writerToken,
        {
          reason: 'Alasan Rahasia',
        },
      )
      await call(
        'POST',
        `/v1/contracts/${created.body?.id}/terminate`,
        terminatorToken,
        {
          date: day(),
          reason: { system: 'id.termination-reason', code: 'resigned' },
          notes: 'Catatan Rahasia',
        },
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(3),
      )

      for (const event of [
        'contract_create',
        'contract_activate',
        'contract_terminate',
      ]) {
        expect(written.filter((entry) => entry.event === event)).toHaveLength(1)
      }
      const text = JSON.stringify(written)
      for (const secret of [
        'Rahasia',
        'LOG-CHECK-9',
        'log-check-9',
        '2026-01-05',
      ]) {
        expect(text).not.toContain(secret)
      }
    } finally {
      restore()
    }
  })
})
