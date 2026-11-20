import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type ChangeRecorder } from '@utility/history/recorder'
import { type Employee } from '@repository/model/employee'
import { type EmploymentContract } from '@repository/model/employment-contract'
import { type HolidayEntry } from '@repository/model/holiday-calendar'
import { type LeaveLedgerEntry } from '@repository/model/leave-ledger-entry'
import { type LeavePolicy } from '@repository/model/leave-policy'
import { type LeaveRequest } from '@repository/model/leave-request'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { CodeConceptService } from '../concept/code-concept.service'
import { LeaveBalanceService } from '../leave/leave-balance.service'
import { type LeaveCaller } from '../leave/leave-caller'
import { LeaveDeciderService } from '../leave/decider'
import { LeaveDecisionService } from '../leave/leave-decision.service'
import { LeaveEndEarlyService } from '../leave/leave-end-early.service'
import { LeaveDetailService } from '../leave/leave-detail.service'
import { LeavePlaceService } from '../leave/leave-place'
import { LeavePolicyService } from '../leave/leave-policy.service'
import { LeaveTypeChangeService } from '../leave/leave-type-change.service'
import { LeaveRequestService } from '../leave/leave-request.service'
import {
  InMemoryCodeConcepts,
  InMemoryEmployees,
  InMemoryEmploymentContracts,
  InMemoryFacilities,
  InMemoryHolidayCalendars,
  InMemoryLeaveLedger,
  InMemoryLeavePolicies,
  InMemoryLeaveRequestDetails,
  InMemoryLeaveRequests,
  InMemoryOrganizationUnits,
  InMemoryPositionAssignments,
  InMemoryPositions,
  InMemoryRosterAssignments,
  InMemoryRosters,
} from './in-memory'

/**
 * A small hospital for the leave specs: a tenant with a facility, a ward under a department, a
 * nurse in the ward with 12 days of annual leave granted, and the Heads of the ward and the
 * department. Today is 2026-11-19. Every repository is in memory.
 */
export async function createLeaveWorld() {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' as const }

  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const logger = { log, warn, error, debug } as unknown as AppLogger
  const recordAccess = vi.fn(async () => ({}))
  const changes = { recordAccess, record: vi.fn() } as unknown as ChangeRecorder
  let workingWeek: unknown = [1, 2, 3, 4, 5]
  const parameters = { resolve: vi.fn(async () => ({ value: workingWeek })) }
  const transactions = { run: (work: () => Promise<unknown>) => work() } as never

  const employees = new InMemoryEmployees()
  const contracts = new InMemoryEmploymentContracts()
  const assignments = new InMemoryPositionAssignments()
  const positions = new InMemoryPositions()
  const units = new InMemoryOrganizationUnits()
  const facilities = new InMemoryFacilities()
  const calendars = new InMemoryHolidayCalendars()
  const rosters = new InMemoryRosters()
  const rosterAssignments = new InMemoryRosterAssignments()
  const ledger = new InMemoryLeaveLedger()
  const requests = new InMemoryLeaveRequests()
  const details = new InMemoryLeaveRequestDetails()
  const policies = new InMemoryLeavePolicies()
  const concepts = new InMemoryCodeConcepts()

  const conceptService = new CodeConceptService(concepts, logger)
  const policyService = new LeavePolicyService(policies, conceptService, requests, transactions, logger)
  const place = new LeavePlaceService(assignments, units, facilities)
  const decider = new LeaveDeciderService(positions, assignments)
  const balances = new LeaveBalanceService(employees, contracts, ledger, requests, policyService, place, logger)
  const request = new LeaveRequestService(
    requests, details, employees, contracts, rosters, rosterAssignments, calendars,
    conceptService, policyService, balances, place, decider, parameters as never, transactions, logger,
  )
  const detail = new LeaveDetailService(requests, details, decider, changes, transactions, logger)
  const typeChange = new LeaveTypeChangeService(requests, ledger, conceptService, policyService, balances, request, place, transactions, logger)
  const effects = { onApproved: vi.fn(async () => {}), onCancelled: vi.fn(async () => {}), onShortened: vi.fn(async () => {}) }
  const endEarly = new LeaveEndEarlyService(requests, ledger, place, effects, transactions, logger)
  const decision = new LeaveDecisionService(requests, employees, ledger, policies, balances, place, decider, effects, transactions, logger)

  /**
   * Runs `work` as a seed request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function seed<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'seed', actor }, work)
  }

  /**
   * Adds a code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param status - Concept status.
   */
  function addConcept(system: string, code: string, status: 'active' | 'retired' = 'active') {
    return seed(() =>
      concepts.create({ system, code, display: [{ locale: 'en', text: code }], properties: {}, mappings: [], period: null, status }),
    )
  }

  /**
   * Adds an employee with an active contract.
   *
   * @param options - Tenant, status, contract start and type.
   * @returns The employee.
   */
  async function addEmployee(options: { tenant?: string; status?: Employee['employment_status']; start?: string; type?: string; contractStatus?: EmploymentContract['status'] } = {}): Promise<Employee> {
    const tenant = options.tenant ?? tenantId
    const employee = await seed(() =>
      employees.create({
        tenant_id: tenant, employee_number: `E${new Types.ObjectId().toHexString().slice(-6)}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] }, other_names: [], display_name: 'Siti', administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' }, is_clinical: false, profession: null, specialties: [], clinical_level: null,
        employment_status: options.status ?? 'active', employment_status_since: '2024-03-15', current_employment: null, primary_assignment: null,
        original_hire_date: '2024-03-15', separation_date: null, practitioner_ids: [], work_contacts: [], photo: null, preferred_language: null,
      }),
    )
    await seed(() =>
      contracts.create({
        tenant_id: tenant, employee_id: employee.id, organization_id: organizationId, contract_number: `C${employee.id.slice(-6)}`,
        employment_type: { system: 'id.employment-type', code: options.type ?? 'pkwtt' }, period: { start: options.start ?? '2024-03-15', end: null },
        probation_end_date: null, fte: 1, working_time_scheme: null, status: options.contractStatus ?? 'active', previous_contract_id: null, termination: null, document: null,
      }),
    )
    return employee
  }

  /**
   * Adds a unit of the facility.
   *
   * @param parent - Its parent unit, or `null`.
   * @returns The unit.
   */
  function addUnit(parent: OrganizationUnit | null = null): Promise<OrganizationUnit> {
    return seed(() =>
      units.create({
        tenant_id: tenantId, organization_id: organizationId, facility_id: facilityId, code: `u-${new Types.ObjectId().toHexString()}`, name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' }, parent_id: parent?.id ?? null, ancestor_ids: parent ? [...parent.ancestor_ids, parent.id] : [], is_clinical: true,
        external_ids: [], period: { start: '2026-01-01', end: null }, status: 'active',
      }),
    )
  }

  /**
   * Assigns an employee to a unit: as its Head, or to an ordinary position as the primary assignment.
   *
   * @param employee - The employee.
   * @param unit - The unit.
   * @param head - Whether the employee becomes the Head of the unit.
   * @param status - Status of the assignment.
   */
  async function assign(employee: Employee, unit: OrganizationUnit, head = false, status: 'active' | 'planned' = 'active') {
    const position =
      (head ? await positions.findActiveHead(tenantId, unit.id) : null) ??
      (await seed(() =>
        positions.create({
          tenant_id: tenantId, unit_id: unit.id, code: `p-${new Types.ObjectId().toHexString()}`, title: [{ locale: 'en', text: head ? 'Head' : 'Nurse' }],
          kind: head ? 'structural' : 'functional', is_head_of_unit: head, allowed_professions: [], grade: null, budgeted_headcount: 10, job_description: null, period: null, status: 'active',
        }),
      ))
    await seed(() =>
      assignments.create({
        tenant_id: tenantId, employee_id: employee.id, contract_id: new Types.ObjectId().toHexString(), position_id: position.id, unit_id: unit.id, facility_id: facilityId,
        is_primary: true, is_head_of_unit: head, kind: { system: 'id.assignment-kind', code: 'hire' }, period: { start: '2024-03-15', end: null }, fte: 1, status, is_open: true, decision_ref: null,
      }),
    )
  }

  /**
   * Stores a leave policy version.
   *
   * @param code - Leave type code.
   * @param balance - Balance rule.
   * @param override - Other fields.
   * @returns The policy.
   */
  function addPolicy(code: string, balance: LeavePolicy['balance'], override: Partial<LeavePolicy> = {}) {
    return seed(() =>
      policies.create({
        tenant_id: tenantId, leave_type: { system: 'id.leave-type', code }, effective_from: '2020-01-01', balance, counting: 'working_days', half_days: true, paid: true,
        employment_types: [], approval: { steps: 'one_step', two_step_above_days: null }, notice_days: 0, retroactive_days: 0, max_days_per_request: 366, proof: null, notes: null,
        source: { kind: 'manual', bundle_id: null }, ...override,
      }),
    )
  }

  /**
   * Posts a ledger entry, by default into the period 2026-03-15 to 2027-03-14 of annual leave.
   *
   * @param employee - The employee.
   * @param kind - What the entry does.
   * @param days - Signed days.
   * @param override - Other fields.
   */
  function post(employee: Employee, kind: LeaveLedgerEntry['kind'], days: number, override: Partial<LeaveLedgerEntry> = {}) {
    return seed(() =>
      ledger.append({
        tenant_id: employee.tenant_id, employee_id: employee.id, leave_type: { system: 'id.leave-type', code: 'tahunan' }, period: { start: '2026-03-15', end: '2027-03-14' },
        kind, days, bucket: 'own', expires_on: null, source: { kind: 'job', ref_id: null, date: null }, dedupe_key: null, ...override,
      }),
    )
  }

  /**
   * Adds a holiday calendar of the facility's code with days.
   *
   * @param days - Dates and kinds.
   */
  function addCalendar(days: [string, HolidayEntry['kind']][]) {
    return seed(() =>
      calendars.create({
        tenant_id: tenantId, code: 'id-national', year: 2026, country: 'ID', subdivision: null, last_import_id: null,
        holidays: days.map(([date, kind]) => ({ date, name: [{ locale: 'en', text: 'Libur' }], kind, source: 'manual' as const, status: 'active' as const, import_id: null })),
      }),
    )
  }

  /**
   * Adds a roster of a unit with planned shifts of an employee.
   *
   * @param unit - The unit.
   * @param period - First and last day.
   * @param status - Roster status.
   * @param worked - Employee and the dates they work (`P`) or have a day off (`L`).
   */
  async function addRoster(unit: OrganizationUnit, period: { start: string; end: string }, status: 'draft' | 'submitted' | 'approved' | 'published' | 'closed' = 'published', worked?: { employee: Employee; dates: string[]; off?: string[] }) {
    const roster = await seed(() =>
      rosters.create({
        tenant_id: tenantId, unit_id: unit.id, facility_id: facilityId, period, status, revision: 1, prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
        submitted: null, approved: null, published: null, closed: null, return_reason: null, coverage_overrides: [], validation: null,
      }),
    )
    const rows: [string, 'regular' | 'off'][] = [...(worked?.dates ?? []).map((date) => [date, 'regular'] as [string, 'regular']), ...(worked?.off ?? []).map((date) => [date, 'off'] as [string, 'off'])]
    for (const [date, type] of rows) {
      await seed(() =>
        rosterAssignments.create({
          tenant_id: tenantId, roster_id: roster.id, unit_id: unit.id, facility_id: facilityId, employee_id: worked!.employee.id, date,
          shift: { definition_id: new Types.ObjectId().toHexString(), code: type === 'off' ? 'L' : 'P', type, start_time: type === 'off' ? null : '07:00', end_time: type === 'off' ? null : '15:00', paid_minutes: type === 'off' ? 0 : 480, is_night: false },
          starts_at: new Date(`${date}T00:00:00Z`), ends_at: type === 'off' ? null : new Date(`${date}T08:00:00Z`), role: 'staff', status: 'planned', source: { kind: 'roster', ref_id: null },
          change_reason: null, revision: 1, overtime: null, flag: null, is_flagged: false,
        } as never),
      )
    }
    return roster
  }

  /**
   * Stores a leave request directly.
   *
   * @param who - The requester.
   * @param override - Fields that replace the defaults of a requested leave of 3 days in December.
   * @returns The request.
   */
  function addRequest(who: Employee, override: Partial<LeaveRequest> = {}) {
    return seed(() =>
      requests.create({
        tenant_id: who.tenant_id, employee_id: who.id, unit_id: null, facility_id: null, leave_type: { system: 'id.leave-type', code: 'tahunan' }, policy_id: new Types.ObjectId().toHexString(),
        rules: { balance_kind: 'period', counting: 'working_days', steps: 'one_step' }, period: { start: '2026-12-01', end: '2026-12-03' }, half_days: { first: false, last: false },
        days: [], total_days: 3, entitlement_period: { start: '2026-03-15', end: '2027-03-14' },
        deciders: { first: { kind: 'hr_manager', unit_id: null, employee_id: null }, second: false }, replacement: null, decisions: [], status: 'requested',
        status_since: new Date(), proof_due_on: null, proof_received: false, cover: null, ...override,
      }),
    )
  }

  /**
   * Builds a caller; by default a signed-in employee with no permission.
   *
   * @param override - Fields that replace the defaults.
   * @returns The caller.
   */
  function caller(override: Partial<LeaveCaller> = {}): LeaveCaller {
    return { accountId: 'acc', employeeId: null, canRead: false, canReadDetails: false, canWrite: false, canDecide: false, canApproveHr: false, ...override }
  }

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asAdmin<T>(work: () => Promise<T>): Promise<T> {
    return seed(work)
  }

  const facility = await seed(() =>
    facilities.create({
      tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta',
      holiday_calendar_codes: ['id-national'], external_ids: [], status: 'active',
    }),
  )
  const facilityId = facility.id
  for (const [system, code] of [['id.leave-type', 'tahunan'], ['id.leave-type', 'sakit'], ['id.leave-type', 'menikah'], ['id.employment-type', 'pkwtt'], ['id.employment-type', 'pkwt']]) {
    await addConcept(system, code)
  }
  const parent = await addUnit()
  const ward = await addUnit(parent)
  const headP = await addEmployee()
  await assign(headP, parent, true)
  const headU = await addEmployee()
  await assign(headU, ward, true)
  const nurse = await addEmployee()
  await assign(nurse, ward)
  const annualPolicy = await addPolicy('tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false })
  await post(nurse, 'grant', 12)

  return {
    tenantId, otherTenantId, organizationId, facilityId, facility, parent, ward, headP, headU, nurse, annualPolicy,
    repos: { employees, contracts, assignments, positions, units, facilities, calendars, rosters, rosterAssignments, ledger, requests, details, policies, concepts },
    services: { request, detail, decision, typeChange, endEarly, balances, policies: policyService, decider },
    logs: { log, warn, error, debug, written: () => JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls, debug.mock.calls]) },
    recordAccess,
    effects,
    parameters,
    setWorkingWeek: (value: unknown) => {
      workingWeek = value
    },
    seed, asAdmin, addEmployee, addUnit, assign, addPolicy, post, addCalendar, addRoster, addRequest, caller,
  }
}

/**
 * The world of the leave specs.
 */
export type LeaveWorld = Awaited<ReturnType<typeof createLeaveWorld>>
