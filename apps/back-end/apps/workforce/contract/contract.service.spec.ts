import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryOrganizations,
} from '../testing/in-memory'
import {
  ContractService,
  type CreateContractInput,
  type UpdateContractInput,
} from './contract.service'

describe('ContractService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const runWork = async (work: () => Promise<unknown>) => {
    transactionDepth += 1
    try {
      return await work()
    } finally {
      transactionDepth -= 1
    }
  }
  const run = vi.fn(runWork)
  let contracts: InMemoryEmploymentContracts
  let employees: InMemoryEmployees
  let organizations: InMemoryOrganizations
  let concepts: InMemoryCodeConcepts
  let service: ContractService
  let eventOutbox: InMemoryEventOutbox
  let transactionDepth = 0
  const depthAtAppend: number[] = []
  let employeeId: string
  let organizationId: string

  const type = (code: string) => ({ system: 'id.employment-type', code })

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext(
      {
        correlationId: 'c1',
        actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
      },
      work,
    )
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
    await asAdmin(() =>
      concepts.create({
        system,
        code,
        display: [{ locale: 'en', text: code }],
        properties,
        mappings: [],
        period: null,
        status,
      }),
    )
  }

  /**
   * Adds an employee to a tenant.
   *
   * @param tenant - Tenant of the employee.
   * @param number - Employee number.
   * @param status - Employment status.
   * @returns The employee.
   */
  function addEmployee(
    tenant: string,
    number: string,
    status: 'onboarding' | 'active' | 'separated' = 'onboarding',
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: number,
        name: {
          use: 'official',
          text: 'Siti',
          given: [],
          prefix: [],
          suffix: [],
        },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: {
          system: 'id.workforce-category',
          code: 'non_klinis',
        },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
        employment_status: status,
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      }),
    )
  }

  /**
   * Adds an organization to a tenant.
   *
   * @param tenant - Tenant of the organization.
   * @param code - Organization code.
   * @param status - Organization status.
   * @returns The organization.
   */
  function addOrganization(
    tenant: string,
    code: string,
    status: 'active' | 'inactive' = 'active',
  ) {
    return asAdmin(() =>
      organizations.create({
        tenant_id: tenant,
        code,
        legal_name: 'PT',
        country: 'ID',
        identifiers: [],
        currency: 'IDR',
        status,
      }),
    )
  }

  /**
   * Creates a draft through the service; the defaults make an open-ended permanent contract.
   *
   * @param override - Fields that replace the defaults.
   * @param employee - Employee of the contract.
   * @returns The draft.
   */
  function create(
    override: Partial<CreateContractInput> = {},
    employee = employeeId,
  ) {
    counter += 1
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId: employee,
        organizationId,
        contractNumber: `pkwtt/${counter}`,
        employmentType: type('pkwtt'),
        period: { start: '2026-01-05' },
        ...override,
      }),
    )
  }
  let counter = 0

  /**
   * Creates and activates a contract.
   *
   * @param override - Fields that replace the defaults.
   * @param employee - Employee of the contract.
   * @returns The active contract.
   */
  async function active(
    override: Partial<CreateContractInput> = {},
    employee = employeeId,
  ) {
    const draft = await create(override, employee)
    return asAdmin(() => service.activate(tenantId, draft.id, {}))
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    run.mockImplementation(runWork)
    depthAtAppend.length = 0
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    contracts = new InMemoryEmploymentContracts()
    employees = new InMemoryEmployees()
    organizations = new InMemoryOrganizations()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    eventOutbox = new InMemoryEventOutbox()
    const append = eventOutbox.append.bind(eventOutbox)
    eventOutbox.append = async (event) => {
      depthAtAppend.push(transactionDepth)
      return append(event)
    }
    service = new ContractService(
      contracts,
      employees,
      organizations,
      new CodeConceptService(concepts, logger),
      { run } as never,
      eventOutbox,
      logger,
    )
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
    await addConcept('id.termination-reason', 'lama', {}, 'retired')
    employeeId = (await addEmployee(tenantId, 'RS-1')).id
    organizationId = (await addOrganization(tenantId, 'rs-group')).id
    counter = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('creates a draft with the number in upper case and full time by default', async () => {
      const created = await create({
        contractNumber: ' pkwtt/2026-001 ',
        probationEndDate: '2026-04-05',
        workingTimeScheme: {
          system: 'id.working-time-scheme',
          code: 'shift_40',
        },
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        organization_id: organizationId,
        contract_number: 'PKWTT/2026-001',
        employment_type: type('pkwtt'),
        period: { start: '2026-01-05', end: null },
        probation_end_date: '2026-04-05',
        fte: 1,
        working_time_scheme: { code: 'shift_40' },
        status: 'draft',
        previous_contract_id: null,
        termination: null,
        document: null,
      })
    })

    it('creates a fixed-term contract with an end date and a part-time fraction', async () => {
      const created = await create({
        employmentType: type('pkwt'),
        period: { start: '2026-01-05', end: '2026-12-31' },
        fte: 0.5,
      })

      expect(created).toMatchObject({
        period: { end: '2026-12-31' },
        fte: 0.5,
        probation_end_date: null,
      })
    })

    it('writes one success entry without any value', async () => {
      await create({ contractNumber: 'secret-number' })

      expect(log).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'contract_create',
          outcome: 'success',
        }),
      )
      const text = JSON.stringify(log.mock.calls)
      expect(text).not.toContain('SECRET-NUMBER')
      expect(text).not.toContain('secret-number')
      expect(text).not.toContain('2026-01-05')
    })

    it.each([
      ['a bad number', { contractNumber: 'A B' }, 'invalid_contract_number'],
      ['an fte of 0', { fte: 0 }, 'invalid_fte'],
      ['an fte above 1', { fte: 1.5 }, 'invalid_fte'],
      [
        'a type of another kind of system',
        { employmentType: { system: 'id.bank', code: 'x' } },
        'invalid_employment_type',
      ],
      ['an unknown type', { employmentType: type('nope') }, 'unknown_code'],
      ['a retired type', { employmentType: type('lama') }, 'code_retired'],
      [
        'a fixed-term type without an end date',
        { employmentType: type('pkwt') },
        'end_date_required',
      ],
      [
        'an end before the start',
        { period: { start: '2026-02-01', end: '2026-01-01' } },
        'invalid_period',
      ],
      [
        'a bad start date',
        { period: { start: '2026-02-30' } },
        'invalid_period',
      ],
      [
        'probation for a type that does not allow it',
        {
          employmentType: type('pkwt'),
          period: { start: '2026-01-05', end: '2026-12-31' },
          probationEndDate: '2026-02-01',
        },
        'probation_not_allowed',
      ],
      [
        'a probation outside the period',
        { probationEndDate: '2025-12-31' },
        'invalid_probation_date',
      ],
      [
        'a scheme of another kind of system',
        { workingTimeScheme: { system: 'id.bank', code: 'x' } },
        'invalid_working_time_scheme',
      ],
      [
        'an unknown scheme',
        {
          workingTimeScheme: { system: 'id.working-time-scheme', code: 'nope' },
        },
        'unknown_code',
      ],
    ])('rejects %s with 422 %s', async (_label, override, code) => {
      await expect(create(override)).rejects.toMatchObject({
        kind: 'invalid',
        code,
      })
    })

    it('answers one error for a missing, malformed and foreign employee, and refuses a separated one', async () => {
      const foreign = (await addEmployee(otherTenantId, 'X-1')).id
      const separated = (await addEmployee(tenantId, 'RS-2', 'separated')).id

      for (const id of [
        new Types.ObjectId().toHexString(),
        'not-an-id',
        foreign,
      ]) {
        await expect(create({}, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      await expect(create({}, separated)).rejects.toMatchObject({
        code: 'employee_separated',
      })
    })

    it('answers one error for a missing and foreign employer, and another for an inactive one', async () => {
      const foreign = (await addOrganization(otherTenantId, 'x')).id
      const inactive = (await addOrganization(tenantId, 'closed', 'inactive'))
        .id

      for (const id of [new Types.ObjectId().toHexString(), foreign]) {
        await expect(create({ organizationId: id })).rejects.toMatchObject({
          code: 'organization_not_found',
        })
      }
      await expect(create({ organizationId: inactive })).rejects.toMatchObject({
        code: 'organization_inactive',
      })
    })

    it('answers 409 for a taken number in the same employer, in any letter case, and allows it for another employer', async () => {
      await create({ contractNumber: 'c-1' })
      const other = (await addOrganization(tenantId, 'other-group')).id

      await expect(create({ contractNumber: 'C-1' })).rejects.toMatchObject({
        kind: 'conflict',
        code: 'contract_exists',
      })
      expect(
        (await create({ contractNumber: 'c-1', organizationId: other }))
          .organization_id,
      ).toBe(other)

      // The pre-check misses a request that lost the race; the unique index still decides.
      vi.spyOn(contracts, 'findByNumber').mockResolvedValueOnce(null)
      await expect(create({ contractNumber: 'c-1' })).rejects.toMatchObject({
        code: 'contract_exists',
      })
    })
  })

  describe('renewal', () => {
    it('links a renewal to an active contract of the same employee that started earlier', async () => {
      const first = await active({ period: { start: '2026-01-05' } })

      const renewal = await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
      })

      expect(renewal.previous_contract_id).toBe(first.id)
    })

    it.each([
      [
        'a missing contract',
        () => new Types.ObjectId().toHexString(),
        'previous_contract_not_found',
      ],
      ['a malformed id', () => 'not-an-id', 'previous_contract_not_found'],
    ])('refuses %s', async (_label, id, code) => {
      await expect(create({ previousContractId: id() })).rejects.toMatchObject({
        code,
      })
    })

    it('refuses a contract of another employee, a draft, a renewal that starts too early and a second renewal', async () => {
      const first = await active({ period: { start: '2026-01-05' } })
      const otherEmployee = (await addEmployee(tenantId, 'RS-2')).id
      const draft = await create(
        { period: { start: '2026-02-01' } },
        otherEmployee,
      )

      await expect(
        create(
          { previousContractId: first.id, period: { start: '2026-03-01' } },
          otherEmployee,
        ),
      ).rejects.toMatchObject({ code: 'previous_contract_not_found' })
      await expect(
        create(
          { previousContractId: draft.id, period: { start: '2026-03-01' } },
          otherEmployee,
        ),
      ).rejects.toMatchObject({ code: 'previous_contract_status' })
      await expect(
        create({
          previousContractId: first.id,
          period: { start: '2026-01-05' },
        }),
      ).rejects.toMatchObject({ code: 'invalid_renewal_period' })
      await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
      })
      await expect(
        create({
          previousContractId: first.id,
          period: { start: '2026-03-02' },
        }),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: 'contract_already_renewed',
      })
    })
  })

  describe('update', () => {
    it('corrects a draft, checking the new values together with the unchanged ones', async () => {
      const draft = await create({ period: { start: '2026-01-05' } })

      const updated = await asAdmin(() =>
        service.update(tenantId, draft.id, {
          employmentType: type('pkwt'),
          period: { start: '2026-01-05', end: '2026-12-31' },
          fte: 0.8,
          workingTimeScheme: {
            system: 'id.working-time-scheme',
            code: 'shift_40',
          },
          reason: 'Typo',
        }),
      )

      expect(updated).toMatchObject({
        employment_type: type('pkwt'),
        period: { end: '2026-12-31' },
        fte: 0.8,
        working_time_scheme: { code: 'shift_40' },
        version: draft.version + 1,
      })
    })

    it('rechecks the unchanged fields against a changed type', async () => {
      const draft = await create({ probationEndDate: '2026-04-05' })

      await expect(
        asAdmin(() =>
          service.update(tenantId, draft.id, { employmentType: type('pkwt') }),
        ),
      ).rejects.toMatchObject({ code: 'end_date_required' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, draft.id, {
            employmentType: type('pkwt'),
            period: { start: '2026-01-05', end: '2026-12-31' },
          }),
        ),
      ).rejects.toMatchObject({ code: 'probation_not_allowed' })
    })

    it('clears the probation, the scheme and the renewal link with null', async () => {
      const first = await active({ period: { start: '2026-01-01' } })
      const draft = await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
        probationEndDate: '2026-06-01',
        workingTimeScheme: {
          system: 'id.working-time-scheme',
          code: 'shift_40',
        },
      })

      const updated = await asAdmin(() =>
        service.update(tenantId, draft.id, {
          probationEndDate: null,
          workingTimeScheme: null,
          previousContractId: null,
        }),
      )

      expect(updated).toMatchObject({
        probation_end_date: null,
        working_time_scheme: null,
        previous_contract_id: null,
      })
    })

    it('keeps its own renewal link valid and refuses a link another contract already holds', async () => {
      const first = await active({ period: { start: '2026-01-01' } })
      const mine = await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
      })

      const kept = await asAdmin(() =>
        service.update(tenantId, mine.id, {
          fte: 0.5,
          previousContractId: first.id,
        }),
      )
      expect(kept.fte).toBe(0.5)

      const other = await create({ period: { start: '2026-03-05' } })
      await expect(
        asAdmin(() =>
          service.update(tenantId, other.id, { previousContractId: first.id }),
        ),
      ).rejects.toMatchObject({ code: 'contract_already_renewed' })
    })

    it('refuses anything but a draft, an empty update, and ignores the employee, employer and number', async () => {
      const draft = await create()
      const activated = await asAdmin(() =>
        service.activate(tenantId, draft.id, {}),
      )

      await expect(
        asAdmin(() => service.update(tenantId, activated.id, { fte: 0.5 })),
      ).rejects.toMatchObject({ code: 'contract_not_draft' })
      const second = await create({}, (await addEmployee(tenantId, 'RS-2')).id)
      await expect(
        asAdmin(() => service.update(tenantId, second.id, {})),
      ).rejects.toMatchObject({ code: 'empty_update' })
      await expect(
        asAdmin(() =>
          service.update(tenantId, second.id, {
            contractNumber: 'X',
            employeeId: 'x',
            organizationId: 'y',
          } as never),
        ),
      ).rejects.toMatchObject({ code: 'empty_update' })
      const edited = await asAdmin(() =>
        service.update(tenantId, second.id, {
          fte: 0.5,
          employeeId: 'x',
          contractNumber: 'X',
        } as UpdateContractInput),
      )
      expect(edited).toMatchObject({
        organization_id: organizationId,
        contract_number: second.contract_number,
      })
    })

    it('answers 409 stale_version, and not found for another tenant', async () => {
      const draft = await create()
      await asAdmin(() => service.update(tenantId, draft.id, { fte: 0.5 }))

      await expect(
        asAdmin(() =>
          service.update(tenantId, draft.id, {
            fte: 0.6,
            version: draft.version,
          }),
        ),
      ).rejects.toMatchObject({ kind: 'conflict', code: 'stale_version' })
      await expect(
        asAdmin(() => service.update(otherTenantId, draft.id, { fte: 0.6 })),
      ).rejects.toMatchObject({ code: 'contract_not_found' })
    })
  })

  describe('activate', () => {
    it('activates a draft and sets the employee summary', async () => {
      const draft = await create({ period: { start: '2026-01-05' } })

      const activated = await asAdmin(() =>
        service.activate(tenantId, draft.id, { reason: 'Signed' }),
      )

      expect(activated.status).toBe('active')
      expect((await employees.findOne(employeeId))?.current_employment).toEqual(
        {
          contract_id: draft.id,
          organization_id: organizationId,
          employment_type: type('pkwtt'),
          start_date: '2026-01-05',
        },
      )
      expect(run).toHaveBeenCalledTimes(1)
    })

    it('activates on the start date or the day before, but not earlier', async () => {
      const tomorrow = await create({ period: { start: '2026-03-11' } })
      const later = await create(
        { period: { start: '2026-03-12' } },
        (await addEmployee(tenantId, 'RS-2')).id,
      )

      expect(
        (await asAdmin(() => service.activate(tenantId, tomorrow.id, {})))
          .status,
      ).toBe('active')
      await expect(
        asAdmin(() => service.activate(tenantId, later.id, {})),
      ).rejects.toMatchObject({ code: 'contract_not_started' })
    })

    it('refuses anything but a draft, a separated employee, and a second active contract', async () => {
      const first = await active()
      const second = await create({ period: { start: '2026-02-01' } })

      await expect(
        asAdmin(() => service.activate(tenantId, first.id, {})),
      ).rejects.toMatchObject({ code: 'contract_not_draft' })
      await expect(
        asAdmin(() => service.activate(tenantId, second.id, {})),
      ).rejects.toMatchObject({
        kind: 'conflict',
        code: 'active_contract_exists',
      })
      expect(
        (await employees.findOne(employeeId))?.current_employment?.contract_id,
      ).toBe(first.id)

      const other = (await addEmployee(tenantId, 'RS-2')).id
      const draft = await create({}, other)
      await employees.update(other, { employment_status: 'separated' })
      await expect(
        asAdmin(() => service.activate(tenantId, draft.id, {})),
      ).rejects.toMatchObject({ code: 'employee_separated' })
    })

    it('supersedes the active contract when activating its renewal, and moves the summary', async () => {
      const first = await active({
        period: { start: '2026-01-05', end: '2026-06-30' },
        employmentType: type('pkwt'),
      })
      const renewal = await create({
        previousContractId: first.id,
        employmentType: type('pkwtt'),
        period: { start: '2026-03-01' },
      })

      const activated = await asAdmin(() =>
        service.activate(tenantId, renewal.id, {}),
      )

      expect(activated.status).toBe('active')
      expect((await contracts.findOne(first.id))?.status).toBe('superseded')
      expect(
        (await employees.findOne(employeeId))?.current_employment,
      ).toMatchObject({
        contract_id: renewal.id,
        employment_type: type('pkwtt'),
        start_date: '2026-03-01',
      })
    })

    it('activates the renewal of an ended contract without a second active one', async () => {
      const first = await active({
        period: { start: '2026-01-05', end: '2026-02-28' },
        employmentType: type('pkwt'),
      })
      await asAdmin(() => service.end(tenantId, first.id, {}))
      const renewal = await create({
        previousContractId: first.id,
        period: { start: '2026-03-05' },
      })

      await asAdmin(() => service.activate(tenantId, renewal.id, {}))

      expect((await contracts.findOne(first.id))?.status).toBe('ended')
      expect(
        (await contracts.findActiveByEmployee(tenantId, employeeId))?.id,
      ).toBe(renewal.id)
    })

    it('leaves the old contract and the summary alone when the version is stale', async () => {
      const first = await active({ period: { start: '2026-01-05' } })
      const renewal = await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
      })

      await expect(
        asAdmin(() =>
          service.activate(tenantId, renewal.id, {
            version: renewal.version + 7,
          }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })

      expect((await contracts.findOne(first.id))?.status).toBe('active')
      expect((await contracts.findOne(renewal.id))?.status).toBe('draft')
      expect(
        (await employees.findOne(employeeId))?.current_employment?.contract_id,
      ).toBe(first.id)
    })

    it('names the rule when a second active contract appears after the check', async () => {
      const other = await create({ period: { start: '2026-02-01' } })
      const draft = await create({ period: { start: '2026-02-05' } })
      await asAdmin(() => service.activate(tenantId, other.id, {}))

      vi.spyOn(contracts, 'findActiveByEmployee').mockResolvedValueOnce(null)
      await expect(
        asAdmin(() => service.activate(tenantId, draft.id, {})),
      ).rejects.toMatchObject({ code: 'active_contract_exists' })
    })

    it('logs one entry without any value', async () => {
      const draft = await create({ contractNumber: 'secret-number' })
      vi.clearAllMocks()
      run.mockImplementation(runWork)

      await asAdmin(() =>
        service.activate(tenantId, draft.id, { reason: 'Alasan Rahasia' }),
      )

      expect(log).toHaveBeenCalledTimes(1)
      const text = JSON.stringify(log.mock.calls)
      expect(text).not.toContain('Rahasia')
      expect(text).not.toContain('SECRET')
    })
  })

  describe('end', () => {
    it('ends an active contract that reached its end date and clears the summary', async () => {
      const contract = await active({
        employmentType: type('pkwt'),
        period: { start: '2026-01-05', end: '2026-03-11' },
      })

      const ended = await asAdmin(() =>
        service.end(tenantId, contract.id, { reason: 'Expired' }),
      )

      expect(ended.status).toBe('ended')
      expect(
        (await employees.findOne(employeeId))?.current_employment,
      ).toBeNull()
      expect((await employees.findOne(employeeId))?.employment_status).toBe(
        'onboarding',
      )
    })

    it('refuses a contract that is not active, has no end date or has not reached it', async () => {
      const draft = await create({
        employmentType: type('pkwt'),
        period: { start: '2026-01-05', end: '2026-03-01' },
      })
      const open = await active({}, (await addEmployee(tenantId, 'RS-2')).id)
      const future = await active(
        {
          employmentType: type('pkwt'),
          period: { start: '2026-01-05', end: '2026-03-12' },
        },
        (await addEmployee(tenantId, 'RS-3')).id,
      )

      await expect(
        asAdmin(() => service.end(tenantId, draft.id, {})),
      ).rejects.toMatchObject({ code: 'contract_not_active' })
      for (const id of [open.id, future.id]) {
        await expect(
          asAdmin(() => service.end(tenantId, id, {})),
        ).rejects.toMatchObject({ code: 'contract_end_not_reached' })
      }
    })

    it('leaves the summary alone when it points to another contract', async () => {
      const contract = await active({
        employmentType: type('pkwt'),
        period: { start: '2026-01-05', end: '2026-03-01' },
      })
      const pointer = {
        contract_id: new Types.ObjectId().toHexString(),
        organization_id: organizationId,
        employment_type: type('pkwtt'),
        start_date: '2026-01-01',
      }
      await employees.update(employeeId, { current_employment: pointer })

      await asAdmin(() => service.end(tenantId, contract.id, {}))

      expect((await employees.findOne(employeeId))?.current_employment).toEqual(
        pointer,
      )
    })
  })

  describe('terminate', () => {
    it('terminates an active contract with a reason and clears the summary, leaving the status alone', async () => {
      const contract = await active({ period: { start: '2026-01-05' } })

      const terminated = await asAdmin(() =>
        service.terminate(tenantId, contract.id, {
          date: '2026-03-10',
          reason: { system: 'id.termination-reason', code: 'resigned' },
          notes: ' Moved abroad ',
        }),
      )

      expect(terminated).toMatchObject({
        status: 'terminated',
        termination: {
          date: '2026-03-10',
          reason: { code: 'resigned' },
          notes: 'Moved abroad',
        },
        period: { start: '2026-01-05', end: null },
      })
      const employee = await employees.findOne(employeeId)
      expect(employee?.current_employment).toBeNull()
      expect(employee?.employment_status).toBe('onboarding')
    })

    it('refuses a draft, a bad date, bad notes and a reason that is wrong, unknown or retired', async () => {
      const draft = await create()
      const contract = await active(
        {},
        (await addEmployee(tenantId, 'RS-2')).id,
      )
      const reason = { system: 'id.termination-reason', code: 'resigned' }
      const attempt = (input: object) =>
        asAdmin(() =>
          service.terminate(tenantId, contract.id, {
            date: '2026-03-10',
            reason,
            ...input,
          }),
        )

      await expect(
        asAdmin(() =>
          service.terminate(tenantId, draft.id, { date: '2026-03-10', reason }),
        ),
      ).rejects.toMatchObject({ code: 'contract_not_active' })
      for (const date of ['2026-02-30', '2026-01-04', '2026-03-12']) {
        await expect(attempt({ date })).rejects.toMatchObject({
          code: 'invalid_termination_date',
        })
      }
      await expect(attempt({ notes: '  ' })).rejects.toMatchObject({
        code: 'invalid_termination_notes',
      })
      await expect(attempt({ notes: 'x'.repeat(501) })).rejects.toMatchObject({
        code: 'invalid_termination_notes',
      })
      await expect(
        attempt({ reason: { system: 'id.bank', code: 'x' } }),
      ).rejects.toMatchObject({ code: 'invalid_termination_reason' })
      await expect(
        attempt({ reason: { system: 'id.termination-reason', code: 'nope' } }),
      ).rejects.toMatchObject({ code: 'unknown_code' })
      await expect(
        attempt({ reason: { system: 'id.termination-reason', code: 'lama' } }),
      ).rejects.toMatchObject({ code: 'code_retired' })
    })

    it('answers 409 stale_version, not found for another tenant, and logs no value', async () => {
      const contract = await active()
      vi.clearAllMocks()
      run.mockImplementation(runWork)
      const reason = { system: 'id.termination-reason', code: 'resigned' }

      await expect(
        asAdmin(() =>
          service.terminate(tenantId, contract.id, {
            date: '2026-03-10',
            reason,
            notes: 'Catatan Rahasia',
            version: contract.version + 4,
          }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() =>
          service.terminate(otherTenantId, contract.id, {
            date: '2026-03-10',
            reason,
          }),
        ),
      ).rejects.toMatchObject({ code: 'contract_not_found' })
      expect(
        JSON.stringify([...log.mock.calls, ...warn.mock.calls]),
      ).not.toContain('Rahasia')
    })
  })

  describe('events', () => {
    it('writes one event per activation, end and termination, inside the transaction, with ids only', async () => {
      const ending = await active({
        employmentType: type('pkwt'),
        period: { start: '2026-01-05', end: '2026-03-01' },
      })
      await asAdmin(() => service.end(tenantId, ending.id, {}))
      const terminating = await active(
        {},
        (await addEmployee(tenantId, 'RS-2')).id,
      )
      await asAdmin(() =>
        service.terminate(tenantId, terminating.id, {
          date: '2026-03-10',
          reason: { system: 'id.termination-reason', code: 'resigned' },
          notes: 'Rahasia',
        }),
      )

      expect(eventOutbox.events.map((event) => event.event_type)).toEqual([
        'workforce.contract.activated',
        'workforce.contract.ended',
        'workforce.contract.activated',
        'workforce.contract.terminated',
      ])
      expect(depthAtAppend.every((depth) => depth > 0)).toBe(true)
      expect(eventOutbox.events[1]).toMatchObject({
        tenant_id: tenantId,
        aggregate: { type: 'employment_contract', id: ending.id },
        payload: {
          contract_id: ending.id,
          employee_id: employeeId,
          organization_id: organizationId,
        },
        correlation_id: 'c1',
      })
      const text = JSON.stringify(
        eventOutbox.events.map((event) => event.payload),
      )
      expect(text).not.toContain('Rahasia')
      expect(text).not.toContain('2026-03-10')
      expect(text).not.toContain('PKWTT')
    })

    it('writes no event for a draft, a correction or a refused change', async () => {
      const draft = await create()
      await asAdmin(() => service.update(tenantId, draft.id, { fte: 0.5 }))
      await expect(
        asAdmin(() =>
          service.activate(tenantId, draft.id, { version: draft.version + 9 }),
        ),
      ).rejects.toMatchObject({ code: 'stale_version' })
      await expect(
        asAdmin(() => service.end(tenantId, draft.id, {})),
      ).rejects.toMatchObject({ code: 'contract_not_active' })

      expect(eventOutbox.events).toEqual([])
    })

    it('does not announce a contract superseded by its renewal, only the activation', async () => {
      const first = await active({ period: { start: '2026-01-05' } })
      const renewal = await create({
        previousContractId: first.id,
        period: { start: '2026-03-01' },
      })

      await asAdmin(() => service.activate(tenantId, renewal.id, {}))

      expect(eventOutbox.events.map((event) => event.aggregate.id)).toEqual([
        first.id,
        renewal.id,
      ])
    })
  })

  describe('reads', () => {
    it('lists the contracts of an employee, newest start first, and writes no log', async () => {
      const first = await active({
        period: { start: '2026-01-05', end: '2026-02-01' },
        employmentType: type('pkwt'),
      })
      await asAdmin(() => service.end(tenantId, first.id, {}))
      await create({ period: { start: '2026-02-05' } })
      vi.clearAllMocks()

      const list = await service.list(tenantId, employeeId)

      expect(list.map((contract) => contract.period.start)).toEqual([
        '2026-02-05',
        '2026-01-05',
      ])
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })

    it('gives an empty list for a foreign or missing employee and keeps other tenants out', async () => {
      await create()

      expect(await service.list(otherTenantId, employeeId)).toEqual([])
      expect(
        await service.list(tenantId, new Types.ObjectId().toHexString()),
      ).toEqual([])
    })

    it('gets one contract, and answers not found for another tenant, a malformed id and a missing id, without logging', async () => {
      const draft = await create()
      vi.clearAllMocks()

      expect((await service.get(tenantId, draft.id)).id).toBe(draft.id)
      for (const [tenant, id] of [
        [otherTenantId, draft.id],
        [tenantId, 'not-an-id'],
        [tenantId, new Types.ObjectId().toHexString()],
      ]) {
        await expect(service.get(tenant, id)).rejects.toMatchObject({
          code: 'contract_not_found',
        })
      }
      for (const level of [log, warn, error, debug]) {
        expect(level).not.toHaveBeenCalled()
      }
    })
  })
})
