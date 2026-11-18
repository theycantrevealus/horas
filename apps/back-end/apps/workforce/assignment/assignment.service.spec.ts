import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPositionAssignments,
  InMemoryPositions,
} from '../testing/in-memory'
import { AssignmentService } from './assignment.service'

describe('AssignmentService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const run = vi.fn(async (work: () => Promise<unknown>) => work())
  let assignments: InMemoryPositionAssignments
  let employees: InMemoryEmployees
  let positions: InMemoryPositions
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let contracts: InMemoryEmploymentContracts
  let concepts: InMemoryCodeConcepts
  let service: AssignmentService
  let facilityId: string
  let unitId: string
  let positionId: string
  let employeeId: string
  let contractId: string

  const kind = (code: string) => ({ system: 'id.assignment-kind', code })

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
   * Adds a facility.
   *
   * @param timezone - IANA time zone.
   * @returns The facility.
   */
  function addFacility(timezone: string) {
    return asAdmin(() =>
      facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        code: `f-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone,
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      }),
    )
  }

  /**
   * Adds a unit.
   *
   * @param facility - Facility of the unit.
   * @param tenant - Tenant of the unit.
   * @returns The unit.
   */
  function addUnit(facility = facilityId, tenant = tenantId) {
    return asAdmin(() =>
      units.create({
        tenant_id: tenant,
        organization_id: organizationId,
        facility_id: facility,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      }),
    )
  }

  /**
   * Adds a position.
   *
   * @param override - Fields that replace the defaults.
   * @returns The position.
   */
  function addPosition(
    override: {
      unit?: string
      head?: boolean
      headcount?: number
      status?: 'active' | 'closed'
      tenant?: string
    } = {},
  ) {
    return asAdmin(() =>
      positions.create({
        tenant_id: override.tenant ?? tenantId,
        unit_id: override.unit ?? unitId,
        code: `p-${new Types.ObjectId().toHexString()}`,
        title: [{ locale: 'en', text: 'Nurse' }],
        kind: override.head ? 'structural' : 'functional',
        is_head_of_unit: override.head ?? false,
        allowed_professions: [],
        grade: null,
        budgeted_headcount: override.headcount ?? 5,
        job_description: null,
        period: null,
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Adds an employee.
   *
   * @param status - Employment status.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(
    status: 'active' | 'separated' = 'active',
    tenant = tenantId,
  ) {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString()}`,
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
   * Adds a contract.
   *
   * @param employee - Employee of the contract.
   * @param override - Fields that replace the defaults.
   * @returns The contract.
   */
  function addContract(
    employee = employeeId,
    override: {
      status?: 'draft' | 'active'
      end?: string | null
      fte?: number
      tenant?: string
    } = {},
  ) {
    return asAdmin(() =>
      contracts.create({
        tenant_id: override.tenant ?? tenantId,
        employee_id: employee,
        organization_id: organizationId,
        contract_number: `C${new Types.ObjectId().toHexString()}`,
        employment_type: { system: 'id.employment-type', code: 'pkwtt' },
        period: { start: '2026-01-01', end: override.end ?? null },
        probation_end_date: null,
        fte: override.fte ?? 1,
        working_time_scheme: null,
        status: override.status ?? 'active',
        previous_contract_id: null,
        termination: null,
        document: null,
      }),
    )
  }

  /**
   * Creates an assignment through the service.
   *
   * @param override - Fields that replace the defaults.
   * @returns The assignment.
   */
  function create(
    override: Partial<Parameters<AssignmentService['create']>[1]> = {},
  ) {
    return asAdmin(() =>
      service.create(tenantId, {
        employeeId,
        positionId,
        contractId,
        kind: kind('hire'),
        period: { start: '2026-02-01', end: null },
        ...override,
      }),
    )
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    throw new Error('Expected a rejection')
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    run.mockImplementation(async (work: () => Promise<unknown>) => work())
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))
    assignments = new InMemoryPositionAssignments()
    employees = new InMemoryEmployees()
    positions = new InMemoryPositions()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    contracts = new InMemoryEmploymentContracts()
    concepts = new InMemoryCodeConcepts()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    service = new AssignmentService(
      assignments,
      employees,
      positions,
      units,
      facilities,
      contracts,
      new CodeConceptService(concepts, logger),
      { run } as never,
      logger,
    )
    for (const code of ['hire', 'transfer', 'promotion', 'acting', 'secondment']) {
      await asAdmin(() =>
        concepts.create({
          system: 'id.assignment-kind',
          code,
          display: [{ locale: 'en', text: code }],
          properties: {},
          mappings: [],
          period: null,
          status: 'active',
        }),
      )
    }
    facilityId = (await addFacility('Asia/Jakarta')).id
    unitId = (await addUnit()).id
    positionId = (await addPosition()).id
    employeeId = (await addEmployee()).id
    contractId = (await addContract()).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('creates an active primary assignment, copies the position data and sets the employee summary', async () => {
      const created = await create({
        decisionNumber: ' SK/001 ',
        reason: 'New hire',
      })

      expect(created).toMatchObject({
        tenant_id: tenantId,
        employee_id: employeeId,
        contract_id: contractId,
        position_id: positionId,
        unit_id: unitId,
        facility_id: facilityId,
        is_primary: true,
        is_head_of_unit: false,
        kind: { system: 'id.assignment-kind', code: 'hire' },
        period: { start: '2026-02-01', end: null },
        fte: 1,
        status: 'active',
        is_open: true,
        decision_ref: { number: 'SK/001', document: null },
      })
      const employee = await employees.findOne(employeeId)
      expect(employee?.primary_assignment).toEqual({
        assignment_id: created.id,
        facility_id: facilityId,
        unit_id: unitId,
        position_id: positionId,
      })
    })

    it('writes the assignment and the summary in one transaction and logs one entry without values', async () => {
      await create({ decisionNumber: 'SK/SECRET-1' })

      expect(run).toHaveBeenCalledTimes(1)
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'assignment_create',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('SK/SECRET-1')
    })

    it('makes the first assignment primary and a later one not, unless asked', async () => {
      const first = await create({ fte: 0.5 })
      const second = await create({
        positionId: (await addPosition()).id,
        fte: 0.5,
      })

      expect(first.is_primary).toBe(true)
      expect(second.is_primary).toBe(false)
      expect((await employees.findOne(employeeId))?.primary_assignment?.assignment_id).toBe(
        first.id,
      )
    })

    it('creates a planned assignment without touching the summary when it starts after today in the facility zone', async () => {
      const created = await create({ period: { start: '2026-03-11', end: null } })

      expect(created.status).toBe('planned')
      expect(created.is_open).toBe(true)
      expect((await employees.findOne(employeeId))?.primary_assignment).toBeNull()
    })

    it('reads today in the facility time zone, not in UTC', async () => {
      vi.setSystemTime(new Date('2026-03-10T17:30:00Z'))
      const auckland = await addFacility('Pacific/Auckland')
      const newYork = await addFacility('America/New_York')
      const aucklandUnit = await addUnit(auckland.id)
      const newYorkUnit = await addUnit(newYork.id)
      const aucklandPosition = await addPosition({ unit: aucklandUnit.id })
      const newYorkPosition = await addPosition({ unit: newYorkUnit.id })
      const start = { start: '2026-03-11', end: null }

      const inAuckland = await create({
        positionId: aucklandPosition.id,
        period: start,
        fte: 0.5,
      })
      const inNewYork = await create({
        positionId: newYorkPosition.id,
        period: start,
        fte: 0.5,
      })

      expect(inAuckland.status).toBe('active')
      expect(inNewYork.status).toBe('planned')
    })

    it.each([
      ['invalid_fte', { fte: 1.234 }],
      ['invalid_fte', { fte: 0 }],
      ['invalid_decision_number', { decisionNumber: '  ' }],
      ['invalid_kind', { kind: { system: 'id.unit-type', code: 'hire' } }],
      ['unknown_code', { kind: kind('nonsense') }],
      ['invalid_period', { period: { start: '2026-02-30', end: null } }],
      ['invalid_period', { period: { start: '2026-05-01', end: '2026-04-01' } }],
      ['end_date_required', { kind: kind('acting') }],
      ['end_date_required', { kind: kind('secondment') }],
      ['period_outside_contract', { period: { start: '2025-12-31', end: null } }],
    ])('rejects %s', async (code, override) => {
      const thrown = await rejection(() => create(override))

      expect(thrown).toMatchObject({ code })
      expect(await assignments.findByEmployee(tenantId, employeeId)).toEqual([])
    })

    it('rejects an assignment that runs past the end of a fixed-term contract', async () => {
      await contracts.update(contractId, { status: 'ended' })
      const fixed = await addContract(employeeId, { end: '2026-12-31' })

      for (const period of [
        { start: '2026-02-01', end: null },
        { start: '2026-02-01', end: '2027-01-01' },
      ]) {
        expect(
          await rejection(() => create({ contractId: fixed.id, period })),
        ).toMatchObject({ code: 'period_outside_contract' })
      }
      expect(
        await create({
          contractId: fixed.id,
          period: { start: '2026-02-01', end: '2026-12-31' },
        }),
      ).toMatchObject({ status: 'active' })
    })

    it('rejects a missing, foreign or separated employee', async () => {
      const foreign = await addEmployee('active', otherTenantId)
      const separated = await addEmployee('separated')
      const unknown = new Types.ObjectId().toHexString()

      expect(await rejection(() => create({ employeeId: unknown }))).toMatchObject({
        code: 'employee_not_found',
      })
      expect(await rejection(() => create({ employeeId: 'bad' }))).toMatchObject({
        code: 'employee_not_found',
      })
      expect(
        await rejection(() => create({ employeeId: foreign.id })),
      ).toMatchObject({ code: 'employee_not_found' })
      expect(
        await rejection(() => create({ employeeId: separated.id })),
      ).toMatchObject({ code: 'employee_separated' })
    })

    it('rejects a missing, foreign or closed position', async () => {
      const foreign = await addPosition({ tenant: otherTenantId })
      const closed = await addPosition({ status: 'closed' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id]) {
        expect(await rejection(() => create({ positionId: id }))).toMatchObject({
          code: 'position_not_found',
        })
      }
      expect(
        await rejection(() => create({ positionId: closed.id })),
      ).toMatchObject({ code: 'position_closed' })
    })

    it('rejects a contract that is missing, foreign, of another employee or not active', async () => {
      const other = await addEmployee()
      const ofOther = await addContract(other.id)
      const foreign = await addContract(employeeId, { tenant: otherTenantId })
      const draft = await addContract(employeeId, { status: 'draft' })

      for (const id of [new Types.ObjectId().toHexString(), 'bad', foreign.id, ofOther.id]) {
        expect(await rejection(() => create({ contractId: id }))).toMatchObject({
          code: 'contract_not_found',
        })
      }
      expect(
        await rejection(() => create({ contractId: draft.id })),
      ).toMatchObject({ code: 'contract_not_active' })
    })

    it('refuses a second open primary and leaves the first untouched', async () => {
      const first = await create({ fte: 0.5 })

      const another = await addPosition()
      const thrown = await rejection(() =>
        create({ positionId: another.id, isPrimary: true, fte: 0.5 }),
      )

      expect(thrown).toMatchObject({ code: 'primary_exists' })
      expect(await assignments.findOpenByEmployee(tenantId, employeeId)).toHaveLength(1)
      expect(
        (await employees.findOne(employeeId))?.primary_assignment?.assignment_id,
      ).toBe(first.id)
    })

    it('refuses overlapping assignments whose full-time equivalents exceed the contract', async () => {
      await create({ fte: 0.6 })

      expect(
        await rejection(async () =>
          create({ positionId: (await addPosition()).id, fte: 0.5 }),
        ),
      ).toMatchObject({ code: 'fte_exceeded' })
      expect(
        await create({ positionId: (await addPosition()).id, fte: 0.4 }),
      ).toMatchObject({ fte: 0.4 })
    })

    it('does not add the full-time equivalents of assignments that do not overlap', async () => {
      await create({ fte: 1, period: { start: '2026-02-01', end: '2026-02-28' } })

      expect(
        await create({
          positionId: (await addPosition()).id,
          fte: 1,
          period: { start: '2026-03-01', end: null },
        }),
      ).toMatchObject({ fte: 1 })
    })

    it('lets only one person hold a head-of-unit position at a time', async () => {
      const head = await addPosition({ head: true, headcount: 1 })
      const other = await addEmployee()
      const otherContract = await addContract(other.id)
      await create({ positionId: head.id })

      expect(
        await rejection(() =>
          create({
            employeeId: other.id,
            contractId: otherContract.id,
            positionId: head.id,
          }),
        ),
      ).toMatchObject({ code: 'head_exists' })
    })

    it('refuses a holder beyond the budgeted headcount, but not an acting one', async () => {
      const post = await addPosition({ headcount: 1 })
      const other = await addEmployee()
      const otherContract = await addContract(other.id)
      const third = await addEmployee()
      const thirdContract = await addContract(third.id)
      await create({ positionId: post.id })

      expect(
        await rejection(() =>
          create({
            employeeId: other.id,
            contractId: otherContract.id,
            positionId: post.id,
          }),
        ),
      ).toMatchObject({ code: 'headcount_exceeded' })
      expect(
        await create({
          employeeId: third.id,
          contractId: thirdContract.id,
          positionId: post.id,
          kind: kind('acting'),
          period: { start: '2026-02-01', end: '2026-06-30' },
        }),
      ).toMatchObject({ kind: { code: 'acting' } })
    })

    it('counts an acting holder neither against the headcount nor as a regular holder', async () => {
      const post = await addPosition({ headcount: 1 })
      const other = await addEmployee()
      const otherContract = await addContract(other.id)
      await create({
        positionId: post.id,
        kind: kind('acting'),
        period: { start: '2026-02-01', end: '2026-06-30' },
      })

      expect(
        await create({
          employeeId: other.id,
          contractId: otherContract.id,
          positionId: post.id,
        }),
      ).toMatchObject({ status: 'active' })
    })

    it('writes nothing when the transaction fails', async () => {
      run.mockImplementationOnce(async () => {
        throw new Error('boom')
      })

      await expect(create()).rejects.toThrow('boom')

      expect(await assignments.findByEmployee(tenantId, employeeId)).toEqual([])
      expect(warn.mock.calls.length + error.mock.calls.length).toBe(1)
    })
  })

  describe('end', () => {
    it('ends an open assignment, clears the summary of a primary one and logs without values', async () => {
      const created = await create({ decisionNumber: 'SK/SECRET-2' })
      log.mockClear()

      const ended = await asAdmin(() =>
        service.end(tenantId, created.id, {
          date: '2026-03-10',
          version: created.version,
          reason: 'Transfer',
        }),
      )

      expect(ended).toMatchObject({
        status: 'ended',
        is_open: false,
        period: { start: '2026-02-01', end: '2026-03-10' },
      })
      expect((await employees.findOne(employeeId))?.primary_assignment).toBeNull()
      expect(log.mock.calls[0]?.[0]).toMatchObject({
        event: 'assignment_end',
        outcome: 'success',
      })
      expect(JSON.stringify(log.mock.calls)).not.toContain('SK/SECRET-2')
    })

    it('keeps the summary of another primary assignment when a non-primary one ends', async () => {
      const first = await create({ fte: 0.5 })
      const second = await create({ positionId: (await addPosition()).id, fte: 0.5 })

      await asAdmin(() => service.end(tenantId, second.id, { date: '2026-03-10' }))

      expect(
        (await employees.findOne(employeeId))?.primary_assignment?.assignment_id,
      ).toBe(first.id)
    })

    it('allows a transfer: end the old primary assignment, then create the new one', async () => {
      const old = await create()
      await asAdmin(() => service.end(tenantId, old.id, { date: '2026-03-10' }))

      const next = await create({
        positionId: (await addPosition()).id,
        kind: kind('transfer'),
        period: { start: '2026-03-11', end: null },
      })

      expect(next).toMatchObject({ is_primary: true, status: 'planned' })
    })

    it('ends a planned assignment on its start date so it never becomes active', async () => {
      const planned = await create({ period: { start: '2026-03-11', end: null } })

      const ended = await asAdmin(() =>
        service.end(tenantId, planned.id, { date: '2026-03-11' }),
      )

      expect(ended).toMatchObject({ status: 'ended', is_open: false })
    })

    it.each([
      ['before the start', '2026-01-31'],
      ['later than tomorrow', '2026-03-12'],
      ['not a date', '2026-02-30'],
      ['badly shaped', '10-03-2026'],
    ])('rejects an end date %s', async (_label, date) => {
      const created = await create()

      expect(
        await rejection(() => asAdmin(() => service.end(tenantId, created.id, { date }))),
      ).toMatchObject({ code: 'invalid_end_date' })
      expect((await assignments.findOne(created.id))?.is_open).toBe(true)
    })

    it('rejects ending twice', async () => {
      const created = await create()
      await asAdmin(() => service.end(tenantId, created.id, { date: '2026-03-10' }))

      expect(
        await rejection(() =>
          asAdmin(() => service.end(tenantId, created.id, { date: '2026-03-10' })),
        ),
      ).toMatchObject({ code: 'assignment_not_open' })
    })

    it('rejects a stale version and changes nothing', async () => {
      const created = await create()

      expect(
        await rejection(() =>
          asAdmin(() =>
            service.end(tenantId, created.id, {
              date: '2026-03-10',
              version: created.version + 5,
            }),
          ),
        ),
      ).toMatchObject({ code: 'stale_version' })
      expect((await assignments.findOne(created.id))?.is_open).toBe(true)
      expect(
        (await employees.findOne(employeeId))?.primary_assignment?.assignment_id,
      ).toBe(created.id)
    })

    it('answers 404 for a missing, malformed or foreign assignment', async () => {
      const created = await create()

      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect(
          await rejection(() =>
            asAdmin(() => service.end(tenantId, id, { date: '2026-03-10' })),
          ),
        ).toMatchObject({ code: 'assignment_not_found' })
      }
      expect(
        await rejection(() =>
          asAdmin(() =>
            service.end(otherTenantId, created.id, { date: '2026-03-10' }),
          ),
        ),
      ).toMatchObject({ code: 'assignment_not_found' })
    })
  })

  describe('lists', () => {
    it('lists the assignments of an employee, newest start first, and writes no log entry', async () => {
      const first = await create({ period: { start: '2026-02-01', end: '2026-02-28' } })
      await asAdmin(() => service.end(tenantId, first.id, { date: '2026-02-28' }))
      const second = await create({ period: { start: '2026-03-01', end: null } })
      log.mockClear()

      const list = await service.listByEmployee(tenantId, employeeId)

      expect(list.map((item) => item.id)).toEqual([second.id, first.id])
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('answers 404 for the employee of another tenant, a missing one and a malformed id, without logging', async () => {
      for (const id of [(await addEmployee('active', otherTenantId)).id, new Types.ObjectId().toHexString(), 'bad']) {
        await expect(service.listByEmployee(tenantId, id)).rejects.toMatchObject({
          code: 'employee_not_found',
        })
      }
      expect([log, warn, error, debug].flatMap((fn) => fn.mock.calls)).toEqual([])
    })

    it('lists the assignments of a unit by status with paging, and not those of other units', async () => {
      const otherUnit = await addUnit()
      const elsewhere = await addPosition({ unit: otherUnit.id })
      const planned = await create({ period: { start: '2026-03-11', end: null }, fte: 0.5 })
      await create({ positionId: elsewhere.id, fte: 0.5 })
      const other = await addEmployee()
      const otherContract = await addContract(other.id)
      const active = await create({
        employeeId: other.id,
        contractId: otherContract.id,
        period: { start: '2026-02-01', end: null },
      })

      const all = await service.listByUnit(tenantId, unitId, {})
      const onlyPlanned = await service.listByUnit(tenantId, unitId, {
        status: 'planned',
      })
      const secondPage = await service.listByUnit(tenantId, unitId, {
        limit: 1,
        offset: 1,
      })

      expect(all.map((item) => item.id).sort()).toEqual([active.id, planned.id].sort())
      expect(onlyPlanned.map((item) => item.id)).toEqual([planned.id])
      expect(secondPage).toHaveLength(1)
    })

    it('answers 404 for a unit of another tenant, a missing one and a malformed id', async () => {
      const foreign = await addUnit(facilityId, otherTenantId)

      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        await expect(service.listByUnit(tenantId, id, {})).rejects.toMatchObject({
          code: 'unit_not_found',
        })
      }
    })
  })
})
