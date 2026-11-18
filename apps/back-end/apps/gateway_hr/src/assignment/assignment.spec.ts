import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { AssignmentManagementModule } from './assignment-management.module'

describe('assignment endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let organizationId: string
  let facilityId: string
  let unitId: string
  let counter = 0

  /**
   * Adds a position in a unit.
   *
   * @param unit - Unit of the position.
   * @param override - Fields that replace the defaults.
   * @returns The position.
   */
  function addPosition(
    unit = unitId,
    override: { head?: boolean; headcount?: number } = {},
  ) {
    counter += 1
    return workforce.positions.create({
      tenant_id: tenantId,
      unit_id: unit,
      code: `p-${counter}`,
      title: [{ locale: 'en', text: 'Nurse' }],
      kind: override.head ? 'structural' : 'functional',
      is_head_of_unit: override.head ?? false,
      allowed_professions: [],
      grade: null,
      budgeted_headcount: override.headcount ?? 5,
      job_description: null,
      period: null,
      status: 'active',
    })
  }

  /**
   * Adds an employee with an active contract.
   *
   * @param tenant - Tenant of the employee.
   * @returns The employee and contract identifiers.
   */
  async function addEmployee(tenant = tenantId) {
    counter += 1
    const employee = await workforce.employees.create({
      tenant_id: tenant,
      employee_number: `E${counter}`,
      name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
      other_names: [],
      display_name: 'Siti',
      administrative_gender: null,
      workforce_category: { system: 'id.workforce-category', code: 'non_klinis' },
      is_clinical: false,
      profession: null,
      specialties: [],
      clinical_level: null,
      employment_status: 'active',
      employment_status_since: '2026-01-01',
      current_employment: null,
      primary_assignment: null,
      original_hire_date: '2026-01-01',
      separation_date: null,
      practitioner_ids: [],
      work_contacts: [],
      photo: null,
      preferred_language: null,
    })
    const contract = await workforce.contracts.create({
      tenant_id: tenant,
      employee_id: employee.id,
      organization_id: organizationId,
      contract_number: `C${counter}`,
      employment_type: { system: 'id.employment-type', code: 'pkwtt' },
      period: { start: '2026-01-01', end: null },
      probation_end_date: null,
      fte: 1,
      working_time_scheme: null,
      status: 'active',
      previous_contract_id: null,
      termination: null,
      document: null,
    })
    return { employeeId: employee.id, contractId: contract.id }
  }

  /**
   * Creates an assignment through the API as the writer.
   *
   * @param body - Request body.
   * @returns The reply.
   */
  function createAssignment(body: object) {
    return call('POST', '/v1/assignments', writerToken, body)
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
      modules: [AssignmentManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_ASSIGNMENT_READ,
      PERMISSIONS.WORKFORCE_ASSIGNMENT_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_ASSIGNMENT_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_ASSIGNMENT_READ,
      PERMISSIONS.WORKFORCE_ASSIGNMENT_WRITE,
    ])
    for (const code of ['hire', 'transfer', 'promotion', 'acting', 'secondment']) {
      await workforce.codeConcepts.create({
        system: 'id.assignment-kind',
        code,
        display: [{ locale: 'en', text: code }],
        properties: {},
        mappings: [],
        period: null,
        status: 'active',
      })
    }
    organizationId = new Types.ObjectId().toHexString()
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
    unitId = (
      await workforce.units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: 'ward-a',
        name: [{ locale: 'en', text: 'Ward A' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      })
    ).id
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and without its own permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', `/v1/employees/${id}/assignments`, undefined],
      ['GET', `/v1/units/${id}/assignments`, undefined],
      ['POST', '/v1/assignments', {}],
      ['POST', `/v1/assignments/${id}/end`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(
      ([method]) => method === 'POST',
    )) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
  })

  it('creates an assignment, lists it by employee and by unit, and ends it', async () => {
    const { employeeId, contractId } = await addEmployee()
    const position = await addPosition()

    const created = await createAssignment({
      employeeId,
      positionId: position.id,
      contractId,
      kind: { system: 'id.assignment-kind', code: 'hire' },
      period: { start: '2026-02-01' },
      decisionNumber: 'SK/2026/001',
    })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      employee_id: employeeId,
      position_id: position.id,
      unit_id: unitId,
      facility_id: facilityId,
      is_primary: true,
      status: 'active',
      is_open: true,
      period: { start: '2026-02-01', end: null },
    })
    expect(body).not.toHaveProperty('_id')
    const byEmployee = await call(
      'GET',
      `/v1/employees/${employeeId}/assignments`,
      readerToken,
    )
    const byUnit = await call(
      'GET',
      `/v1/units/${unitId}/assignments?status=active`,
      readerToken,
    )
    expect(byEmployee.status).toBe(200)
    expect(byEmployee.body).toHaveLength(1)
    expect(byUnit.status).toBe(200)
    expect((byUnit.body as Record<string, any>[]).map((a) => a.id)).toContain(
      body.id,
    )

    const today = new Date().toISOString().slice(0, 10)
    const ended = await call('POST', `/v1/assignments/${body.id}/end`, writerToken, {
      date: today,
      version: body.version,
    })
    expect(ended.status).toBe(201)
    expect(ended.body).toMatchObject({ status: 'ended', is_open: false })
  })

  it('answers 404 for a missing, malformed or foreign id', async () => {
    const unknown = new Types.ObjectId().toHexString()
    const { employeeId } = await addEmployee(otherTenantId)
    const foreignUnit = (
      await workforce.units.create({
        tenant_id: otherTenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: 'foreign',
        name: [{ locale: 'en', text: 'X' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      })
    ).id

    for (const url of [
      `/v1/employees/${unknown}/assignments`,
      '/v1/employees/bad/assignments',
      `/v1/employees/${employeeId}/assignments`,
    ]) {
      const reply = await call('GET', url, readerToken)
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'employee_not_found' })
    }
    for (const url of [
      `/v1/units/${unknown}/assignments`,
      '/v1/units/bad/assignments',
      `/v1/units/${foreignUnit}/assignments`,
    ]) {
      expect((await call('GET', url, readerToken)).body).toMatchObject({
        code: 'unit_not_found',
      })
    }
    for (const id of [unknown, 'bad']) {
      expect(
        (
          await call('POST', `/v1/assignments/${id}/end`, writerToken, {
            date: '2026-03-01',
          })
        ).body,
      ).toMatchObject({ code: 'assignment_not_found' })
    }
    const mine = await addEmployee()
    const position = await addPosition()
    const created = await createAssignment({
      employeeId: mine.employeeId,
      positionId: position.id,
      contractId: mine.contractId,
      kind: { system: 'id.assignment-kind', code: 'hire' },
      period: { start: '2026-02-01' },
    })
    expect(
      (
        await call(
          'POST',
          `/v1/assignments/${(created.body as Record<string, any>).id}/end`,
          otherTenantToken,
          { date: '2026-03-01' },
        )
      ).body,
    ).toMatchObject({ code: 'assignment_not_found' })
  })

  it('answers 409 for a second primary, a second head and a full position', async () => {
    const first = await addEmployee()
    const second = await addEmployee()
    const head = await addPosition(unitId, { head: true, headcount: 1 })
    const small = await addPosition(unitId, { headcount: 1 })
    const hire = { system: 'id.assignment-kind', code: 'hire' }
    const base = { kind: hire, period: { start: '2026-02-01' } }

    expect(
      (
        await createAssignment({
          ...base,
          employeeId: first.employeeId,
          contractId: first.contractId,
          positionId: head.id,
          fte: 0.5,
        })
      ).status,
    ).toBe(201)
    const secondHead = await createAssignment({
      ...base,
      employeeId: second.employeeId,
      contractId: second.contractId,
      positionId: head.id,
    })
    const secondPrimary = await createAssignment({
      ...base,
      employeeId: first.employeeId,
      contractId: first.contractId,
      positionId: small.id,
      fte: 0.5,
      isPrimary: true,
    })
    expect(secondHead.status).toBe(409)
    expect(secondHead.body).toMatchObject({ code: 'head_exists' })
    expect(secondPrimary.status).toBe(409)
    expect(secondPrimary.body).toMatchObject({ code: 'primary_exists' })

    await createAssignment({
      ...base,
      employeeId: second.employeeId,
      contractId: second.contractId,
      positionId: small.id,
    })
    const full = await createAssignment({
      ...base,
      employeeId: first.employeeId,
      contractId: first.contractId,
      positionId: small.id,
      fte: 0.5,
    })
    expect(full.body).toMatchObject({ code: 'headcount_exceeded' })
  })

  it('validates the request: 400 for shape, 422 for business rules, and list limits', async () => {
    const { employeeId, contractId } = await addEmployee()
    const position = await addPosition()
    const hire = { system: 'id.assignment-kind', code: 'hire' }

    expect((await createAssignment({})).status).toBe(400)
    expect(
      (
        await createAssignment({
          employeeId: 'bad',
          positionId: position.id,
          contractId,
          kind: hire,
          period: { start: '2026-02-01' },
        })
      ).status,
    ).toBe(400)
    const acting = await createAssignment({
      employeeId,
      positionId: position.id,
      contractId,
      kind: { system: 'id.assignment-kind', code: 'acting' },
      period: { start: '2026-02-01' },
    })
    expect(acting.status).toBe(422)
    expect(acting.body).toMatchObject({ code: 'end_date_required' })
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'status=gone']) {
      expect(
        (await call('GET', `/v1/units/${unitId}/assignments?${query}`, readerToken))
          .status,
      ).toBe(400)
    }
    expect(
      (
        await call('POST', '/v1/assignments/x/end', writerToken, {
          date: 'not-a-date',
        })
      ).status,
    ).toBe(400)
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { employeeId } = await addEmployee()
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/employees/${employeeId}/assignments`, readerToken),
        await call('GET', `/v1/units/${unitId}/assignments`, readerToken),
        await call('GET', '/v1/units/missing-id/assignments', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it("logs one entry per write, without the assignment's values", async () => {
    const { employeeId, contractId } = await addEmployee()
    const position = await addPosition()
    const { written, restore } = captureLogs()
    try {
      const created = await createAssignment({
        employeeId,
        positionId: position.id,
        contractId,
        kind: { system: 'id.assignment-kind', code: 'hire' },
        period: { start: '2026-02-01' },
        decisionNumber: 'SK/RAHASIA',
        reason: 'Alasan Rahasia',
      })
      await call(
        'POST',
        `/v1/assignments/${(created.body as Record<string, any>).id}/end`,
        writerToken,
        { date: new Date().toISOString().slice(0, 10), reason: 'Catatan Rahasia' },
      )
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(2),
      )

      const entries = written.filter((entry) => entry.event !== 'http_request')
      expect(entries.map((entry) => entry.event)).toEqual([
        'assignment_create',
        'assignment_end',
      ])
      for (const text of ['SK/RAHASIA', 'Alasan Rahasia', 'Catatan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
