import { Types } from 'mongoose'
import { getRequestContext, runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { CodeConceptService } from '../concept/code-concept.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryFacilities,
  InMemoryLeaveLedger,
  InMemoryLeavePolicies,
  InMemoryOrganizationUnits,
  InMemoryPositionAssignments,
} from '../testing/in-memory'
import { InvalidRequestError, NotFoundError } from '../workforce.error'
import { LeaveBalanceService } from './leave-balance.service'
import { LeavePlaceService } from './leave-place'
import { LeavePolicyService } from './leave-policy.service'

describe('LeavePlaceService and LeaveBalanceService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let employees: InMemoryEmployees
  let contracts: InMemoryEmploymentContracts
  let assignments: InMemoryPositionAssignments
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let ledger: InMemoryLeaveLedger
  let policies: InMemoryLeavePolicies
  let place: LeavePlaceService
  let service: LeaveBalanceService

  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const sick = { system: 'id.leave-type', code: 'sakit' }

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
    return undefined
  }

  /**
   * Adds an employee.
   *
   * @param tenant - Tenant of the record.
   * @returns The employee.
   */
  function addEmployee(tenant = tenantId): Promise<Employee> {
    return asAdmin(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: `E${new Types.ObjectId().toHexString().slice(-6)}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
        employment_status: 'active',
        employment_status_since: '2024-03-15',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2024-03-15',
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
   * @param employee - Its employee.
   * @param start - First day.
   * @param end - Last day, or `null`.
   * @param status - Contract status.
   * @returns The contract.
   */
  function addContract(employee: Employee, start: string, end: string | null = null, status: EmploymentContract['status'] = 'active') {
    return asAdmin(() =>
      contracts.create({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        organization_id: organizationId,
        contract_number: `C${new Types.ObjectId().toHexString().slice(-6)}`,
        employment_type: { system: 'id.employment-type', code: 'pkwtt' },
        period: { start, end },
        probation_end_date: null,
        fte: 1,
        working_time_scheme: null,
        status,
        previous_contract_id: null,
        termination: null,
        document: null,
      }),
    )
  }

  /**
   * Stores a leave policy directly.
   *
   * @param code - Leave type code.
   * @param balance - Balance rule.
   * @returns The policy.
   */
  function addPolicy(code: string, balance: LeavePolicy['balance']) {
    return asAdmin(() =>
      policies.create({
        tenant_id: tenantId,
        leave_type: { system: 'id.leave-type', code },
        effective_from: '2020-01-01',
        balance,
        counting: 'working_days',
        half_days: false,
        paid: true,
        employment_types: [],
        approval: { steps: 'one_step', two_step_above_days: null },
        notice_days: 0,
        retroactive_days: 0,
        max_days_per_request: 366,
        proof: null,
        notes: null,
        source: { kind: 'manual', bundle_id: null },
      }),
    )
  }

  /**
   * Posts a ledger entry directly.
   *
   * @param employee - The employee.
   * @param kind - What the entry does.
   * @param days - Signed days.
   * @param override - Other fields.
   * @returns The entry.
   */
  function post(employee: Employee, kind: LeaveLedgerEntry['kind'], days: number, override: Partial<LeaveLedgerEntry> = {}) {
    return asAdmin(() =>
      ledger.append({
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        leave_type: annual,
        period: { start: '2026-03-15', end: '2027-03-14' },
        kind,
        days,
        bucket: 'own',
        expires_on: null,
        source: { kind: 'job', ref_id: null, date: null },
        dedupe_key: null,
        ...override,
      }),
    )
  }

  /**
   * @returns Everything the logger received, as text.
   */
  function written(): string {
    return JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls, debug.mock.calls])
  }

  let employee: Employee

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T05:00:00Z'))
    employees = new InMemoryEmployees()
    contracts = new InMemoryEmploymentContracts()
    assignments = new InMemoryPositionAssignments()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    ledger = new InMemoryLeaveLedger()
    policies = new InMemoryLeavePolicies()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    const policyService = new LeavePolicyService(
      policies,
      new CodeConceptService(new InMemoryCodeConcepts(), logger),
      { run: (work: () => Promise<unknown>) => work() } as never,
      logger,
    )
    place = new LeavePlaceService(assignments, units, facilities)
    service = new LeaveBalanceService(employees, contracts, ledger, policyService, place, logger)
    employee = await addEmployee()
    await addContract(employee, '2024-03-15')
    await addPolicy('tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false })
    await addPolicy('sakit', { kind: 'none' })
    await addPolicy('melahirkan', { kind: 'per_event', days: 90 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('LeavePlaceService', () => {
    it('answers the unit and facility of the open primary assignment and today in the facility zone', async () => {
      const facility = await asAdmin(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-wit', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jayapura', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
      const unit = await asAdmin(() =>
        units.create({ tenant_id: tenantId, organization_id: organizationId, facility_id: facility.id, code: 'ward-a', name: [{ locale: 'en', text: 'Ward' }], type: { system: 'id.unit-type', code: 'ward' }, parent_id: null, ancestor_ids: [], is_clinical: true, external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active' }),
      )
      await asAdmin(() =>
        assignments.create({
          tenant_id: tenantId, employee_id: employee.id, contract_id: new Types.ObjectId().toHexString(), position_id: new Types.ObjectId().toHexString(), unit_id: unit.id, facility_id: facility.id,
          is_primary: true, is_head_of_unit: false, kind: { system: 'id.assignment-kind', code: 'hire' }, period: { start: '2024-03-15', end: null }, fte: 1, status: 'active', is_open: true, decision_ref: null,
        }),
      )
      vi.setSystemTime(new Date('2026-11-19T16:00:00Z'))

      const found = await place.of(tenantId, employee.id)

      expect(found.unit?.id).toBe(unit.id)
      expect(found.facility?.id).toBe(facility.id)
      // 16:00 UTC is already the next day in Jayapura (UTC+9).
      expect(found.today).toBe('2026-11-20')
    })

    it('answers no unit and no facility without a primary assignment, and today in UTC', async () => {
      expect(await place.of(tenantId, employee.id)).toEqual({ unit: null, facility: null, today: '2026-11-19' })
    })
  })

  describe('balances', () => {
    it('lists the leave types with a period policy, with the balance of the period that holds today', async () => {
      await post(employee, 'grant', 12)
      await post(employee, 'carry_over', 3, { bucket: 'carry_over', expires_on: '2027-06-30' })
      await post(employee, 'use', -3, { bucket: 'carry_over' })
      await post(employee, 'use', -1)

      const balances = await service.balances(tenantId, employee.id)

      expect(balances).toEqual([
        {
          leaveType: annual,
          period: { start: '2026-03-15', end: '2027-03-14' },
          granted: 12,
          used: 4,
          carriedOver: 3,
          carriedOverExpiresOn: '2027-06-30',
          expired: 0,
          adjusted: 0,
          pending: 0,
          available: 11,
          carryOverLeft: 0,
          ownLeft: 11,
        },
      ])
    })

    it('answers the period of onDate, and zeros for a period with no entries', async () => {
      await post(employee, 'grant', 12)

      const [earlier] = await service.balances(tenantId, employee.id, '2025-06-01')

      expect(earlier).toMatchObject({ period: { start: '2025-03-15', end: '2026-03-14' }, granted: 0, available: 0 })
    })

    it('uses a calendar-year policy from 1 January to 31 December', async () => {
      const other = await addEmployee()
      await addContract(other, '2020-01-01')
      await addPolicy('cuti-tahun', { kind: 'period', period: 'calendar_year', days: 10, min_service_months: 0, carry_over: null, deduct_collective_leave: false })
      await post(other, 'grant', 10, { leave_type: { system: 'id.leave-type', code: 'cuti-tahun' }, period: { start: '2026-01-01', end: '2026-12-31' } })

      const found = (await service.balances(tenantId, other.id)).find((view) => view.leaveType.code === 'cuti-tahun')

      expect(found).toMatchObject({ period: { start: '2026-01-01', end: '2026-12-31' }, granted: 10, available: 10 })
    })

    it('answers nothing for an employee with no contract in force', async () => {
      const bare = await addEmployee()
      const ended = await addEmployee()
      await addContract(ended, '2020-01-01', '2021-12-31', 'ended')

      expect(await service.balances(tenantId, bare.id)).toEqual([])
      expect(await service.balances(tenantId, ended.id)).toEqual([])
    })

    it('answers not found for another tenant, a missing and a malformed employee, and writes no log entry', async () => {
      const foreign = await addEmployee(otherTenantId)

      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        const thrown = await rejection(() => service.balances(tenantId, id))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('employee_not_found')
      }
      await service.balances(tenantId, employee.id)
      expect(written()).toBe('[[],[],[],[]]')
    })

    it('never reads another tenant\'s entries', async () => {
      const foreign = await addEmployee(otherTenantId)
      await post(foreign, 'grant', 99)

      const [view] = await service.balances(tenantId, employee.id)

      expect(view?.granted).toBe(0)
    })
  })

  describe('summary', () => {
    it('answers the balance of one type and period for the services of 8.3', async () => {
      await post(employee, 'grant', 12)
      await post(employee, 'use', -2)

      expect(await service.summary(tenantId, employee.id, annual, '2026-03-15')).toMatchObject({ granted: 12, used: 2, available: 10, pending: 0 })
      expect(await service.summary(tenantId, employee.id, annual, '2025-03-15')).toMatchObject({ granted: 0, available: 0 })
    })
  })

  describe('ledger', () => {
    it('lists the entries of one type and period, oldest first and paged, and writes no log entry', async () => {
      await post(employee, 'grant', 12)
      await post(employee, 'use', -2)
      await post(employee, 'grant', 5, { leave_type: sick, period: { start: '2026-01-01', end: '2026-12-31' } })

      const all = await service.ledgerOf(tenantId, employee.id, {})
      const annualOnly = await service.ledgerOf(tenantId, employee.id, { leaveTypeSystem: 'id.leave-type', leaveTypeCode: 'tahunan', periodStart: '2026-03-15' })
      const page = await service.ledgerOf(tenantId, employee.id, { limit: 1, offset: 1 })

      expect(all.map((entry) => entry.days)).toEqual([12, -2, 5])
      expect(annualOnly.map((entry) => entry.kind)).toEqual(['grant', 'use'])
      expect(page.map((entry) => entry.days)).toEqual([-2])
      expect(written()).toBe('[[],[],[],[]]')
    })

    it('answers not found for another tenant\'s employee', async () => {
      const foreign = await addEmployee(otherTenantId)

      expect(await rejection(() => service.ledgerOf(tenantId, foreign.id, {}))).toBeInstanceOf(NotFoundError)
    })
  })

  describe('adjust', () => {
    it('posts an adjustment into the period of the grant with the reason in the change history, and logs no values', async () => {
      await post(employee, 'grant', 12)
      let reasonSeen: string | undefined
      const append = ledger.append.bind(ledger)
      vi.spyOn(ledger, 'append').mockImplementation(async (entry) => {
        reasonSeen = getRequestContext()?.reason
        return append(entry)
      })

      const entry = await asAdmin(() =>
        service.adjust(tenantId, employee.id, { leaveType: annual, periodStart: '2026-03-15', days: -2.5, reason: 'Alasan Rahasia' }),
      )

      expect(entry).toMatchObject({
        kind: 'adjustment',
        days: -2.5,
        bucket: 'own',
        expires_on: null,
        dedupe_key: null,
        leave_type: annual,
        period: { start: '2026-03-15', end: '2027-03-14' },
        source: { kind: 'adjustment', ref_id: null, date: null },
      })
      expect(reasonSeen).toBe('Alasan Rahasia')
      expect((await service.summary(tenantId, employee.id, annual, '2026-03-15')).available).toBe(9.5)
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_adjust', outcome: 'success' })
      for (const text of ['Alasan Rahasia', 'tahunan', '2026-03-15', '-2.5']) {
        expect(written()).not.toContain(text)
      }
    })

    it('lets an adjustment take the balance below zero', async () => {
      await post(employee, 'grant', 2)

      await asAdmin(() => service.adjust(tenantId, employee.id, { leaveType: annual, periodStart: '2026-03-15', days: -4, reason: 'Koreksi' }))

      expect((await service.summary(tenantId, employee.id, annual, '2026-03-15')).available).toBe(-2)
    })

    it.each([
      ['invalid_days', { days: 0 }],
      ['invalid_days', { days: 0.3 }],
      ['invalid_days', { days: 367 }],
      ['invalid_days', { days: -367 }],
      ['invalid_days', { days: Number.NaN }],
      ['reason_required', { reason: '' }],
      ['reason_required', { reason: '   ' }],
      ['invalid_reason', { reason: 'x'.repeat(501) }],
      ['invalid_leave_type', { leaveType: { system: 'id.profession', code: 'perawat' } }],
      ['period_not_found', { periodStart: '2025-03-15' }],
      ['period_not_found', { leaveType: sick }],
    ])('refuses %s', async (code, override) => {
      await post(employee, 'grant', 12)

      const thrown = await rejection(() =>
        asAdmin(() => service.adjust(tenantId, employee.id, { leaveType: annual, periodStart: '2026-03-15', days: 1, reason: 'Koreksi', ...override })),
      )

      expect(thrown).toBeInstanceOf(InvalidRequestError)
      expect((thrown as InvalidRequestError).code).toBe(code)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_adjust', outcome: 'failure', code })
      expect(await ledger.findByEmployee(tenantId, employee.id)).toHaveLength(1)
    })

    it('answers not found for another tenant\'s employee and never touches its ledger', async () => {
      const foreign = await addEmployee(otherTenantId)
      await post(foreign, 'grant', 12)

      const thrown = await rejection(() =>
        asAdmin(() => service.adjust(tenantId, foreign.id, { leaveType: annual, periodStart: '2026-03-15', days: 1, reason: 'Koreksi' })),
      )

      expect(thrown).toBeInstanceOf(NotFoundError)
      expect(await ledger.findByEmployee(otherTenantId, foreign.id)).toHaveLength(1)
    })
  })
})
