import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Employee } from '@repository/model/employee'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type EligibilityService } from '../eligibility/eligibility.service'
import { type ParameterService } from '../parameter/parameter.service'
import {
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryRosterAssignments,
  InMemoryRosters,
  InMemoryShiftSwapRequests,
  InMemoryLeaveRequests,
} from '../testing/in-memory'
import { LeaveCalendar } from '../leave/leave-calendar'
import { SwapService } from './swap.service'

describe('SwapService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  let swaps: InMemoryShiftSwapRequests
  let assignments: InMemoryRosterAssignments
  let rosters: InMemoryRosters
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let employees: InMemoryEmployees
  let service: SwapService
  let leaveRequests: InMemoryLeaveRequests
  let limits: Record<string, number>
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let facilityId: string
  let unitId: string
  let roster: Roster
  let siti: Employee
  let budi: Employee

  // 2099-03-02 is a Monday. The roster is published and in the far future, so no date is in the past.
  const march = { start: '2099-03-01', end: '2099-03-31' }

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asUser<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor: { account_id: 'u1', display_name: 'User', kind: 'account' } }, work)
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
   * @param number - Employee number.
   * @param override - Fields that replace the defaults.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(number: string, override: Partial<Employee> = {}, tenant = tenantId) {
    return asUser(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: number,
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
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
        ...override,
      }),
    )
  }

  /**
   * Adds a unit of the facility.
   *
   * @param override - Status and clinical flag.
   * @returns The unit.
   */
  function addUnit(override: { is_clinical?: boolean; status?: 'active' | 'closed' } = {}) {
    return asUser(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: override.is_clinical ?? false,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Stores a roster of a unit.
   *
   * @param override - Fields that replace the defaults.
   * @returns The roster.
   */
  function addRoster(override: Partial<Roster> = {}) {
    return asUser(() =>
      rosters.create({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period: march,
        status: 'published',
        revision: 1,
        prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
        submitted: null,
        approved: null,
        published: null,
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: null,
        ...override,
      }),
    )
  }

  /**
   * Stores a planned assignment. The default shift is 07:00 to 15:00 Jakarta time, 8 paid hours.
   *
   * @param employee - The employee.
   * @param date - Local date.
   * @param override - Fields that replace the defaults.
   * @returns The assignment.
   */
  function addAssignment(employee: Employee, date: string, override: Partial<RosterAssignment> = {}) {
    return asUser(() =>
      assignments.create({
        tenant_id: tenantId,
        roster_id: roster.id,
        unit_id: roster.unit_id,
        facility_id: facilityId,
        employee_id: employee.id,
        date,
        shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
        starts_at: new Date(`${date}T00:00:00Z`),
        ends_at: new Date(`${date}T08:00:00Z`),
        role: 'staff',
        status: 'planned',
        source: { kind: 'roster', ref_id: null },
        cancellation: null,
        change_reason: null,
        revision: 1,
        overtime: null,
        flag: null,
        is_flagged: false,
        ...override,
      }),
    )
  }

  /**
   * Asks for a swap as an employee.
   *
   * @param as - The signed-in employee, or `null`.
   * @param input - The request.
   * @returns The created request.
   */
  function ask(as: Employee | null, input: { assignmentId: string; counterpartEmployeeId: string; counterpartAssignmentId?: string; reason?: string }) {
    return asUser(() => service.create(tenantId, as?.id ?? null, { reason: 'Keperluan keluarga', ...input }))
  }

  /**
   * Stores a leave request of an employee on one date.
   *
   * @param employeeId - The employee.
   * @param date - The date.
   * @param status - Request status.
   * @param count - What the day counts.
   * @returns The request.
   */
  function onLeave(employeeId: string, date: string, status: 'approved' | 'requested' = 'approved', count: 0.5 | 1 = 1) {
    return asUser(() =>
      leaveRequests.create({ tenant_id: tenantId, employee_id: employeeId, status, period: { start: date, end: date }, days: [{ date, count, why: 'working', set_by: 'working_week' }] } as never),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    limits = { MIN_REST_HOURS: 8, MAX_WEEKLY_HOURS: 40, MAX_OVERTIME_HOURS_WEEK: 18, MAX_CONSECUTIVE_NIGHTS: 3 }
    eligible = { value: { eligible: true } }
    swaps = new InMemoryShiftSwapRequests()
    assignments = new InMemoryRosterAssignments()
    rosters = new InMemoryRosters()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    employees = new InMemoryEmployees()
    const parameters = { resolve: async (_tenant: string, { key }: { key: string }) => ({ value: limits[key] }) } as unknown as ParameterService
    const eligibility = { general: async () => eligible.value } as unknown as EligibilityService
    const logger = { log, warn, error, debug } as unknown as AppLogger
    leaveRequests = new InMemoryLeaveRequests()
    service = new SwapService(swaps, assignments, rosters, units, facilities, employees, eligibility, parameters, { run: (work: () => Promise<unknown>) => work() } as never, new LeaveCalendar(leaveRequests), logger)
    facilityId = (
      await asUser(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
    unitId = (await addUnit()).id
    roster = await addRoster()
    siti = await addEmployee('E001')
    budi = await addEmployee('E002')
  })

  describe('create', () => {
    it('records a trade: both assignments named, requested, and logs one entry without values', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-11')

      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id })

      expect(swap).toMatchObject({
        tenant_id: tenantId,
        unit_id: unitId,
        roster_id: roster.id,
        requester: { employee_id: siti.id, assignment_id: mine.id },
        counterpart: { employee_id: budi.id, assignment_id: theirs.id },
        reason: 'Keperluan keluarga',
        status: 'requested',
        counterpart_accepted_at: null,
        decision: null,
        resulting_assignment_ids: [],
      })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_create', outcome: 'success' })
      const written = JSON.stringify([log.mock.calls, warn.mock.calls, error.mock.calls])
      for (const text of ['Keperluan keluarga', '2099-03-10', siti.id, budi.id]) {
        expect(written).not.toContain(text)
      }
      expect(await assignments.findByRoster(tenantId, roster.id, { limit: 100 })).toHaveLength(2)
    })

    it('records a hand-over with no counterpart assignment', async () => {
      const mine = await addAssignment(siti, '2099-03-10')

      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })

      expect(swap.counterpart).toEqual({ employee_id: budi.id, assignment_id: null })
    })

    it('trades two shifts of the same date, because each person gives up the shift that clashes', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-10', { shift: { definition_id: new Types.ObjectId().toHexString(), code: 'S', type: 'regular', start_time: '14:00', end_time: '22:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2099-03-10T07:00:00Z'), ends_at: new Date('2099-03-10T15:00:00Z') })

      expect((await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id })).status).toBe('requested')
    })

    it('needs a linked employee, and a reason of 1 to 500 characters', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      expect(await rejection(() => ask(null, { assignmentId: mine.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'employee_required' })
      for (const [code, reason] of [['reason_required', ''], ['invalid_reason', 'x'.repeat(501)]] as const) {
        expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, reason }))).toMatchObject({ code })
      }
      expect(await swaps.findByFilter(tenantId)).toEqual([])
    })

    it('answers not found for a missing, malformed or foreign assignment, and refuses one that is not yours', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const foreign = await asUser(() => assignments.create(Object.assign({}, mine, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => ask(siti, { assignmentId: id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'roster_assignment_not_found' })
      }
      expect(await rejection(() => ask(budi, { assignmentId: mine.id, counterpartEmployeeId: siti.id }))).toMatchObject({ code: 'assignment_not_yours' })
    })

    it('refuses a counterpart that is the requester, unknown, foreign or malformed', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const stranger = await addEmployee('E900', {}, otherTenantId)
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: siti.id }))).toMatchObject({ code: 'counterpart_is_requester' })
      for (const id of [stranger.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: id }))).toMatchObject({ code: 'counterpart_not_found' })
      }
    })

    it('refuses a counterpart assignment that is not theirs, is in another roster, or is missing', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const third = await addEmployee('E003')
      const notTheirs = await addAssignment(third, '2099-03-11')
      const otherRoster = await addRoster({ unit_id: (await addUnit()).id, period: { start: '2099-04-01', end: '2099-04-30' } })
      const elsewhere = await addAssignment(budi, '2099-03-12', { roster_id: otherRoster.id, unit_id: otherRoster.unit_id })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: notTheirs.id }))).toMatchObject({ code: 'counterpart_assignment_mismatch' })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: elsewhere.id }))).toMatchObject({ code: 'different_roster' })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: new Types.ObjectId().toHexString() }))).toMatchObject({ code: 'roster_assignment_not_found' })
    })

    it('swaps only in a published roster of an open unit, and only planned, unflagged shifts that are not in the past', async () => {
      for (const status of ['draft', 'submitted', 'approved', 'closed'] as const) {
        const other = await addRoster({ status, unit_id: (await addUnit()).id })
        const slot = await addAssignment(siti, '2099-03-10', { roster_id: other.id, unit_id: other.unit_id })
        expect(await rejection(() => ask(siti, { assignmentId: slot.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'roster_not_published' })
      }
      const closedUnit = await addUnit({ status: 'closed' })
      const closedRoster = await addRoster({ unit_id: closedUnit.id })
      const inClosed = await addAssignment(siti, '2099-03-10', { roster_id: closedRoster.id, unit_id: closedUnit.id })
      expect(await rejection(() => ask(siti, { assignmentId: inClosed.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'unit_closed' })
      const cancelled = await addAssignment(siti, '2099-03-12', { status: 'cancelled' })
      expect(await rejection(() => ask(siti, { assignmentId: cancelled.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'assignment_not_planned' })
      const flagged = await addAssignment(siti, '2099-03-13', { is_flagged: true })
      expect(await rejection(() => ask(siti, { assignmentId: flagged.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'assignment_flagged' })
      const past = await addAssignment(siti, '2020-03-13')
      expect(await rejection(() => ask(siti, { assignmentId: past.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'assignment_in_past' })
      expect(await swaps.findByFilter(tenantId)).toEqual([])
    })

    it('allows one open request per assignment, for either side, until it is closed', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-11')
      const third = await addEmployee('E003')
      const first = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id })

      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: third.id }))).toMatchObject({ code: 'swap_exists' })
      expect(await rejection(() => ask(budi, { assignmentId: theirs.id, counterpartEmployeeId: third.id }))).toMatchObject({ code: 'swap_exists' })
      await asUser(() => service.cancel(tenantId, siti.id, first.id, {}))
      expect((await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: third.id })).status).toBe('requested')
    })

    it('refuses a result that breaks the rules of 8.5, and says which', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      // The counterpart is not assignable.
      const gone = await addEmployee('E004', { employment_status: 'separated' })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: gone.id }))).toMatchObject({ code: 'employee_not_assignable' })
      // The counterpart already has a shift that day.
      await addAssignment(budi, '2099-03-10', { shift: { definition_id: new Types.ObjectId().toHexString(), code: 'S', type: 'regular', start_time: '14:00', end_time: '22:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2099-03-10T07:00:00Z'), ends_at: new Date('2099-03-10T15:00:00Z') })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'assignment_exists' })
      // Too little rest: a night shift that ends when the taken morning shift begins.
      const rested = await addEmployee('E005')
      await addAssignment(rested, '2099-03-09', { shift: { definition_id: new Types.ObjectId().toHexString(), code: 'M', type: 'regular', start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true }, starts_at: new Date('2099-03-09T14:00:00Z'), ends_at: new Date('2099-03-10T00:00:00Z') })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: rested.id }))).toMatchObject({ code: 'rest_too_short' })
      // Overtime is refused: a swap has no consent.
      const busy = await addEmployee('E006')
      for (const day of ['2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05', '2099-03-06']) {
        await addAssignment(busy, day)
      }
      const saturday = await addAssignment(siti, '2099-03-07')
      expect(await rejection(() => ask(siti, { assignmentId: saturday.id, counterpartEmployeeId: busy.id }))).toMatchObject({ code: 'overtime_consent_required' })
      expect(await swaps.findByFilter(tenantId)).toEqual([])
    })

    it('refuses a result that puts either person on a day of approved leave, at create', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-11')
      await onLeave(budi.id, '2099-03-10')
      await onLeave(siti.id, '2099-03-11')

      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id }))).toMatchObject({ code: 'on_leave' })
      expect(await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id }))).toMatchObject({ code: 'on_leave' })
      expect(await swaps.findByFilter(tenantId)).toEqual([])
    })

    it('refuses a counterpart who is not clinically eligible for a clinical unit', async () => {
      const ward = await addUnit({ is_clinical: true })
      const clinical = await addRoster({ unit_id: ward.id })
      const nurse = await addEmployee('E007', { is_clinical: true })
      const colleague = await addEmployee('E008', { is_clinical: true })
      const slot = await addAssignment(nurse, '2099-03-10', { roster_id: clinical.id, unit_id: ward.id })
      eligible.value = { eligible: false, failed: 'sip' }
      expect(await rejection(() => ask(nurse, { assignmentId: slot.id, counterpartEmployeeId: colleague.id }))).toMatchObject({ code: 'not_eligible_sip' })
    })

    it('logs a failure with its code and no values', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      await rejection(() => ask(siti, { assignmentId: mine.id, counterpartEmployeeId: siti.id }))

      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_create', outcome: 'failure', code: 'counterpart_is_requester' })
      expect(JSON.stringify(warn.mock.calls)).not.toContain('2099-03-10')
    })
  })

  describe('accept', () => {
    /**
     * Makes a request of a trade between the two employees.
     *
     * @returns The request and both assignments.
     */
    async function trade() {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-11')
      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id })
      return { swap, mine, theirs }
    }

    it('lets the counterpart accept, stamps the answer, and logs counts only', async () => {
      const { swap } = await trade()
      log.mockClear()

      const accepted = await asUser(() => service.accept(tenantId, budi.id, swap.id, {}))

      expect(accepted).toMatchObject({ id: swap.id, status: 'accepted_by_counterpart' })
      expect(accepted.counterpart_accepted_at).toBeInstanceOf(Date)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_accept', outcome: 'success' })
    })

    it('refuses to accept when a leave was approved on the day in the meantime, and leaves the request waiting', async () => {
      const { swap } = await trade()
      await onLeave(budi.id, '2099-03-10')

      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'on_leave' })
      expect((await swaps.findOne(swap.id))?.status).toBe('requested')
    })

    it('refuses anyone but the counterpart, a missing employee link, and a second accept', async () => {
      const { swap } = await trade()
      const third = await addEmployee('E003')
      expect(await rejection(() => asUser(() => service.accept(tenantId, siti.id, swap.id, {})))).toMatchObject({ code: 'not_the_counterpart' })
      expect(await rejection(() => asUser(() => service.accept(tenantId, third.id, swap.id, {})))).toMatchObject({ code: 'not_the_counterpart' })
      expect(await rejection(() => asUser(() => service.accept(tenantId, null, swap.id, {})))).toMatchObject({ code: 'employee_required' })
      await asUser(() => service.accept(tenantId, budi.id, swap.id, {}))
      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'invalid_transition' })
    })

    it('answers a stale version, and not found for a missing, malformed or foreign request', async () => {
      const { swap } = await trade()
      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, { version: swap.version + 5 })))).toMatchObject({ code: 'stale_version' })
      const foreign = await asUser(() => swaps.create(Object.assign({}, swap, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, id, {})))).toMatchObject({ code: 'swap_not_found' })
      }
    })

    it('checks the result again against the schedules as they are now', async () => {
      const { swap } = await trade()
      await addAssignment(budi, '2099-03-10')

      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'assignment_exists' })
      expect((await swaps.findOne(swap.id))?.status).toBe('requested')
    })

    it('refuses when an assignment was cancelled or the roster is no longer published', async () => {
      const { swap, mine } = await trade()
      await asUser(() => assignments.update(mine.id, { status: 'cancelled' }))
      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'assignment_not_planned' })
      await asUser(() => assignments.update(mine.id, { status: 'planned' }))
      await asUser(() => rosters.update(roster.id, { status: 'closed' }))
      expect(await rejection(() => asUser(() => service.accept(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'roster_not_published' })
    })
  })

  describe('cancel', () => {
    it('lets the requester withdraw an open request, before and after the counterpart accepted', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const first = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })
      expect(await asUser(() => service.cancel(tenantId, siti.id, first.id, {}))).toMatchObject({ status: 'cancelled' })
      const second = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })
      await asUser(() => service.accept(tenantId, budi.id, second.id, {}))
      log.mockClear()
      expect(await asUser(() => service.cancel(tenantId, siti.id, second.id, {}))).toMatchObject({ status: 'cancelled' })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_cancel', outcome: 'success' })
    })

    it('refuses anyone but the requester, a final request, and a stale version', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })
      expect(await rejection(() => asUser(() => service.cancel(tenantId, budi.id, swap.id, {})))).toMatchObject({ code: 'not_the_requester' })
      expect(await rejection(() => asUser(() => service.cancel(tenantId, null, swap.id, {})))).toMatchObject({ code: 'employee_required' })
      expect(await rejection(() => asUser(() => service.cancel(tenantId, siti.id, swap.id, { version: swap.version + 5 })))).toMatchObject({ code: 'stale_version' })
      await asUser(() => service.cancel(tenantId, siti.id, swap.id, {}))
      expect(await rejection(() => asUser(() => service.cancel(tenantId, siti.id, swap.id, {})))).toMatchObject({ code: 'invalid_transition' })
      for (const status of ['approved', 'rejected'] as const) {
        const closed = await asUser(() => swaps.create(Object.assign({}, swap, { status }) as never))
        expect(await rejection(() => asUser(() => service.cancel(tenantId, siti.id, closed.id, {})))).toMatchObject({ code: 'invalid_transition' })
      }
    })
  })

  describe('lists', () => {
    it('lists the tenant with filters, latest first, and writes no log entry', async () => {
      const a = await addAssignment(siti, '2099-03-10')
      const b = await addAssignment(budi, '2099-03-11')
      const first = await ask(siti, { assignmentId: a.id, counterpartEmployeeId: budi.id })
      const second = await ask(budi, { assignmentId: b.id, counterpartEmployeeId: siti.id })
      await asUser(() => service.cancel(tenantId, siti.id, first.id, {}))
      await asUser(() => swaps.create(Object.assign({}, second, { tenant_id: otherTenantId }) as never))
      log.mockClear()

      expect((await service.list(tenantId, {})).map((item) => item.id)).toHaveLength(2)
      expect((await service.list(tenantId, { status: 'cancelled' })).map((item) => item.id)).toEqual([first.id])
      expect((await service.list(tenantId, { unitId })).length).toBe(2)
      expect((await service.list(tenantId, { rosterId: new Types.ObjectId().toHexString() }))).toEqual([])
      expect((await service.list(tenantId, { employeeId: budi.id })).length).toBe(2)
      expect(log).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
    })

    it('lists the own requests as requester or counterpart, and needs a linked employee', async () => {
      const a = await addAssignment(siti, '2099-03-10')
      const third = await addEmployee('E003')
      await ask(siti, { assignmentId: a.id, counterpartEmployeeId: budi.id })

      expect(await service.listOwn(tenantId, siti.id, {})).toHaveLength(1)
      expect(await service.listOwn(tenantId, budi.id, {})).toHaveLength(1)
      expect(await service.listOwn(tenantId, third.id, {})).toEqual([])
      expect(await service.listOwn(tenantId, siti.id, { status: 'approved' })).toEqual([])
      expect(() => service.listOwn(tenantId, null, {})).toThrow(expect.objectContaining({ code: 'employee_required' }))
      expect(log).toHaveBeenCalledTimes(1)
    })
  })

  describe('approve and reject', () => {
    /**
     * Makes an accepted request of a trade between the two employees.
     *
     * @returns The request and both assignments.
     */
    async function accepted() {
      const mine = await addAssignment(siti, '2099-03-10')
      const theirs = await addAssignment(budi, '2099-03-11')
      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id, counterpartAssignmentId: theirs.id })
      const ready = await asUser(() => service.accept(tenantId, budi.id, swap.id, {}))
      return { swap: ready, mine, theirs }
    }

    /**
     * Approves as a Head of Unit with no linked employee.
     *
     * @param id - Request identifier.
     * @param input - Version and reason.
     * @returns The approved request.
     */
    function approve(id: string, input: { version?: number; reason?: string } = {}) {
      return asUser(() => service.approve(tenantId, null, id, input))
    }

    it('refuses to approve when a leave was approved on the day in the meantime, and leaves the request accepted', async () => {
      const { swap } = await accepted()
      await onLeave(siti.id, '2099-03-11')

      expect(await rejection(() => approve(swap.id))).toMatchObject({ code: 'on_leave' })
      expect((await swaps.findOne(swap.id))?.status).toBe('accepted_by_counterpart')
    })

    it('approves a trade in one move: the old assignments are cancelled, the new ones exist with the source swap, the roster revision goes up', async () => {
      const { swap, mine, theirs } = await accepted()
      log.mockClear()

      const approved = await approve(swap.id, { reason: 'Setuju' })

      expect(approved).toMatchObject({ id: swap.id, status: 'approved', decision: { by: { account_id: 'u1' }, reason: 'Setuju' } })
      expect(approved.decision?.at).toBeInstanceOf(Date)
      expect(approved.resulting_assignment_ids).toHaveLength(2)
      expect((await assignments.findOne(mine.id))?.status).toBe('cancelled')
      expect((await assignments.findOne(theirs.id))?.status).toBe('cancelled')
      expect(await assignments.findOne(mine.id)).toMatchObject({ revision: 2, change_reason: 'shift_swap' })
      const [toBudi, toSiti] = await Promise.all(approved.resulting_assignment_ids.map((id) => assignments.findOne(id)))
      expect(toBudi).toMatchObject({ employee_id: budi.id, date: '2099-03-10', status: 'planned', role: 'staff', source: { kind: 'swap', ref_id: swap.id }, revision: 2, change_reason: 'shift_swap', overtime: null, shift: mine.shift, starts_at: mine.starts_at, ends_at: mine.ends_at })
      expect(toSiti).toMatchObject({ employee_id: siti.id, date: '2099-03-11', source: { kind: 'swap', ref_id: swap.id }, revision: 2 })
      expect((await rosters.findOne(roster.id))?.revision).toBe(2)
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_approve', outcome: 'success' })
      for (const text of ['Setuju', '2099-03-10', siti.id, budi.id]) {
        expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain(text)
      }
    })

    it('approves a hand-over: the requester gives the shift up and the counterpart takes it', async () => {
      const mine = await addAssignment(siti, '2099-03-10', { role: 'team_leader' })
      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })
      await asUser(() => service.accept(tenantId, budi.id, swap.id, {}))

      const approved = await approve(swap.id)

      expect(approved.decision?.reason).toBeNull()
      expect(approved.resulting_assignment_ids).toHaveLength(1)
      expect((await assignments.findOne(mine.id))?.status).toBe('cancelled')
      expect(await assignments.findOne(approved.resulting_assignment_ids[0] ?? '')).toMatchObject({ employee_id: budi.id, role: 'team_leader', date: '2099-03-10' })
      expect(await assignments.findByRoster(tenantId, roster.id, { employeeId: siti.id, status: 'planned' })).toEqual([])
    })

    it('needs an accepted request, and refuses a final one', async () => {
      const mine = await addAssignment(siti, '2099-03-10')
      const swap = await ask(siti, { assignmentId: mine.id, counterpartEmployeeId: budi.id })
      expect(await rejection(() => approve(swap.id))).toMatchObject({ code: 'invalid_transition' })
      await asUser(() => service.accept(tenantId, budi.id, swap.id, {}))
      await approve(swap.id)
      expect(await rejection(() => approve(swap.id))).toMatchObject({ code: 'invalid_transition' })
      expect(await rejection(() => asUser(() => service.reject(tenantId, null, swap.id, { reason: 'Tidak' })))).toMatchObject({ code: 'invalid_transition' })
    })

    it('is never decided by the requester or the counterpart, but may be by an account without an employee', async () => {
      const { swap } = await accepted()
      for (const party of [siti, budi]) {
        expect(await rejection(() => asUser(() => service.approve(tenantId, party.id, swap.id, {})))).toMatchObject({ code: 'decider_is_party' })
        expect(await rejection(() => asUser(() => service.reject(tenantId, party.id, swap.id, { reason: 'x' })))).toMatchObject({ code: 'decider_is_party' })
      }
      const head = await addEmployee('E010')
      expect((await asUser(() => service.approve(tenantId, head.id, swap.id, {}))).status).toBe('approved')
    })

    it('answers a stale version, a bad reason, no actor, and not found for a missing, malformed or foreign request', async () => {
      const { swap } = await accepted()
      expect(await rejection(() => approve(swap.id, { version: swap.version + 5 }))).toMatchObject({ code: 'stale_version' })
      expect(await rejection(() => approve(swap.id, { reason: 'x'.repeat(501) }))).toMatchObject({ code: 'invalid_reason' })
      expect(await rejection(() => service.approve(tenantId, null, swap.id, {}))).toMatchObject({ code: 'actor_required' })
      const foreign = await asUser(() => swaps.create(Object.assign({}, swap, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => approve(id))).toMatchObject({ code: 'swap_not_found' })
      }
      expect((await swaps.findOne(swap.id))?.status).toBe('accepted_by_counterpart')
    })

    it('checks the result again, writes nothing when it no longer holds, and leaves the request for the Head to reject', async () => {
      const { swap, mine } = await accepted()
      await addAssignment(budi, '2099-03-10', { shift: { definition_id: new Types.ObjectId().toHexString(), code: 'S', type: 'regular', start_time: '14:00', end_time: '22:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2099-03-10T07:00:00Z'), ends_at: new Date('2099-03-10T15:00:00Z') })

      expect(await rejection(() => approve(swap.id))).toMatchObject({ code: 'assignment_exists' })

      expect((await swaps.findOne(swap.id))?.status).toBe('accepted_by_counterpart')
      expect((await assignments.findOne(mine.id))?.status).toBe('planned')
      expect((await rosters.findOne(roster.id))?.revision).toBe(1)
      expect((await asUser(() => service.reject(tenantId, null, swap.id, { reason: 'Jadwal berubah' }))).status).toBe('rejected')
    })

    it('refuses when the roster changed after the request was read (stale roster)', async () => {
      const { swap } = await accepted()
      const original = rosters.update.bind(rosters)
      vi.spyOn(rosters, 'update').mockImplementationOnce(async (id, changes) => {
        await original(id, { validation: null })
        return original(id, changes, { expectedVersion: 0 })
      })

      expect(await rejection(() => approve(swap.id))).toMatchObject({ code: 'stale_version' })
    })

    it('rejects an open request with a reason, before or after the counterpart accepted', async () => {
      const a = await addAssignment(siti, '2099-03-10')
      const first = await ask(siti, { assignmentId: a.id, counterpartEmployeeId: budi.id })
      log.mockClear()

      const rejected = await asUser(() => service.reject(tenantId, null, first.id, { reason: 'Kurang orang' }))

      expect(rejected).toMatchObject({ status: 'rejected', decision: { by: { account_id: 'u1' }, reason: 'Kurang orang' } })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'swap_reject', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Kurang orang')
      const second = await ask(siti, { assignmentId: a.id, counterpartEmployeeId: budi.id })
      await asUser(() => service.accept(tenantId, budi.id, second.id, {}))
      expect((await asUser(() => service.reject(tenantId, null, second.id, { reason: 'Tidak' }))).status).toBe('rejected')
      expect((await assignments.findOne(a.id))?.status).toBe('planned')
    })

    it('needs a reason of 1 to 500 characters to reject, and a stale version is refused', async () => {
      const a = await addAssignment(siti, '2099-03-10')
      const swap = await ask(siti, { assignmentId: a.id, counterpartEmployeeId: budi.id })
      for (const [code, reason] of [['reason_required', undefined], ['reason_required', ''], ['invalid_reason', 'x'.repeat(501)]] as const) {
        expect(await rejection(() => asUser(() => service.reject(tenantId, null, swap.id, { reason })))).toMatchObject({ code })
      }
      expect(await rejection(() => asUser(() => service.reject(tenantId, null, swap.id, { reason: 'Tidak', version: swap.version + 5 })))).toMatchObject({ code: 'stale_version' })
      expect(await rejection(() => service.reject(tenantId, null, swap.id, { reason: 'Tidak' }))).toMatchObject({ code: 'actor_required' })
      expect((await swaps.findOne(swap.id))?.status).toBe('requested')
    })
  })
})
