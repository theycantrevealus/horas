import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import type { LeaveDay } from '@repository/model/leave-request'
import {
  InMemoryClinicalAppointments,
  InMemoryCommitteeMemberships,
  InMemoryCredentialApplications,
  InMemoryPracticeScheduleExceptions,
  InMemoryPracticeSchedules,
  InMemoryPrivilegeGrants,
} from '../testing/in-memory'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { SeparationCompletionService } from './separation-completion.service'

describe('SeparationCompletionService', () => {
  let world: LeaveWorld
  let appointments: InMemoryClinicalAppointments
  let grants: InMemoryPrivilegeGrants
  let applications: InMemoryCredentialApplications
  let memberships: InMemoryCommitteeMemberships
  let schedules: InMemoryPracticeSchedules
  let exceptions: InMemoryPracticeScheduleExceptions
  let appended: { type: string; payload: Record<string, unknown>; correlationId: string }[]
  let service: SeparationCompletionService
  const resignation = { system: 'id.separation-type', code: 'resignation' }
  const dismissal = { system: 'id.separation-type', code: 'dismissal' }
  const DAY = '2026-12-31'

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
   * Runs `work` as the job that completes separations.
   *
   * @param work - The call.
   * @returns What `work` returns.
   */
  function asJob<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'job-1', actor: { account_id: 'separation-job', display_name: 'separation-job', kind: 'system' } }, work)
  }

  /**
   * Stores a planned separation of the nurse.
   *
   * @param override - Fields that replace the defaults.
   * @param employeeId - The employee.
   * @returns The separation.
   */
  function addSeparation(override: object = {}, employeeId = world.nurse.id) {
    return world.seed(() =>
      world.repos.separations.create({
        tenant_id: world.tenantId, employee_id: employeeId, facility_id: world.facilityId, type: resignation, contract_action: 'end', last_working_day: DAY, notice_received_on: null,
        immediate: false, status: 'planned', status_since: new Date(), completion: null, checklist: [], settlement: null, ...override,
      } as never),
    )
  }

  /**
   * Completes a separation as the job.
   *
   * @param id - Separation identifier.
   * @param tenant - Tenant of the caller.
   */
  function complete(id: string, tenant = world.tenantId) {
    return asJob(() => service.complete(tenant, id))
  }

  /**
   * Whole days of a leave.
   *
   * @param dates - The dates.
   * @returns The breakdown.
   */
  function days(dates: string[]): LeaveDay[] {
    return dates.map((date) => ({ date, count: 1 as const, why: 'working' as const, set_by: 'working_week' as const }))
  }

  /**
   * Adds a roster of the nurse in a new unit, with planned shifts.
   *
   * @param status - Roster status.
   * @param period - First and last day.
   * @param dates - The dates the nurse works.
   * @returns The roster.
   */
  async function addRoster(status: 'draft' | 'submitted' | 'approved' | 'published' | 'closed', period: { start: string; end: string }, dates: string[]) {
    return world.addRoster(await world.addUnit(world.parent), period, status, { employee: world.nurse, dates })
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-01T05:00:00Z'))
    world = await createLeaveWorld()
    appointments = new InMemoryClinicalAppointments()
    grants = new InMemoryPrivilegeGrants()
    applications = new InMemoryCredentialApplications()
    memberships = new InMemoryCommitteeMemberships()
    schedules = new InMemoryPracticeSchedules()
    exceptions = new InMemoryPracticeScheduleExceptions()
    appended = []
    const logger = { log: world.logs.log, warn: world.logs.warn, error: world.logs.error, debug: world.logs.debug } as never
    service = new SeparationCompletionService(
      world.repos.separations, world.repos.employees, world.repos.rosters, world.repos.rosterAssignments, schedules, exceptions, world.repos.requests, world.repos.ledger,
      appointments, grants, applications, memberships, world.repos.assignments, world.repos.contracts, world.services.balances,
      { append: async (event: { event_type: string; payload: Record<string, unknown>; correlation_id: string }) => void appended.push({ type: event.event_type, payload: event.payload, correlationId: event.correlation_id }) } as never,
      { run: (work: () => Promise<unknown>) => work() } as never, logger,
    )
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('shifts', () => {
    it('cancels the planned shifts after the last working day in every roster that is not closed, and leaves the days up to it', async () => {
      const published = await addRoster('published', { start: '2026-12-28', end: '2027-01-03' }, ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
      const submitted = await addRoster('submitted', { start: '2027-01-04', end: '2027-01-10' }, ['2027-01-05'])
      const closed = await addRoster('closed', { start: '2027-01-11', end: '2027-01-17' }, ['2027-01-12'])
      const draft = await addRoster('draft', { start: '2027-01-18', end: '2027-01-24' }, ['2027-01-19'])
      await world.seed(() => world.repos.rosters.update(submitted.id, { validation: { checked_at: new Date(), violations: 0, coverage_gaps: 0 } }))
      const separation = await addSeparation()

      const done = await complete(separation.id)

      const states = async (id: string) => (await world.repos.rosterAssignments.findByRoster(world.tenantId, id)).map((item) => [item.date, item.status, item.cancellation?.kind ?? null])
      expect(await states(published.id)).toEqual([['2026-12-30', 'planned', null], ['2026-12-31', 'planned', null], ['2027-01-01', 'cancelled', 'separation'], ['2027-01-02', 'cancelled', 'separation']])
      expect((await world.repos.rosters.findOne(published.id))?.revision).toBe(2)
      expect((await world.repos.rosters.findOne(submitted.id))?.validation).toBeNull()
      expect((await states(submitted.id))[0]).toEqual(['2027-01-05', 'cancelled', 'separation'])
      expect((await states(closed.id))[0]).toEqual(['2027-01-12', 'planned', null])
      expect((await states(draft.id))[0]).toEqual(['2027-01-19', 'cancelled', 'separation'])
      expect((await world.repos.rosterAssignments.findByRoster(world.tenantId, draft.id))[0]).toMatchObject({ cancellation: { kind: 'separation', ref_id: separation.id }, change_reason: 'separation' })
      expect(done.completion?.counts.assignments).toBe(4)
    })
  })

  describe('practice sessions', () => {
    it('ends the schedules that run past the last working day on that day, and undoes exceptions that move a session later', async () => {
      const open = await world.seed(() => schedules.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: 1, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2026-01-01', end: null }, status: 'active' }))
      const later = await world.seed(() => schedules.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: 2, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2026-01-01', end: '2027-06-30' }, status: 'active' }))
      const done = await world.seed(() => schedules.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: 3, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2026-01-01', end: '2026-06-30' }, status: 'ended' }))
      const moved = await world.seed(() => exceptions.create({ tenant_id: world.tenantId, schedule_id: open.id, employee_id: world.nurse.id, unit_id: world.ward.id, date: '2026-12-28', kind: 'moved', moved_to: { date: '2027-01-05', start_time: '09:00', end_time: '10:00' }, reason: { system: 'id.practice-exception-reason', code: 'other' }, source: { kind: 'manual', ref_id: null } }))
      const separation = await addSeparation()

      const result = await complete(separation.id)

      expect((await schedules.findOne(open.id))).toMatchObject({ status: 'ended', period: { start: '2026-01-01', end: DAY } })
      expect((await schedules.findOne(later.id))).toMatchObject({ status: 'ended', period: { end: DAY } })
      expect((await schedules.findOne(done.id))).toMatchObject({ status: 'ended', period: { end: '2026-06-30' } })
      expect((await exceptions.findOne(moved.id, { withSoft: true }))?.deleted_at).toBeTruthy()
      expect(result.completion?.counts.sessions).toBe(2)
    })
  })

  describe('leave', () => {
    it('cancels pending requests, cancels approved leave after the last day with its days back, and cuts leave that runs past it', async () => {
      const pending = await world.addRequest(world.nurse, { status: 'requested', period: { start: '2027-01-12', end: '2027-01-13' }, days: days(['2027-01-12', '2027-01-13']), total_days: 2 })
      const head = await world.addRequest(world.nurse, { status: 'head_approved', period: { start: '2026-12-29', end: '2027-01-04' }, days: days(['2026-12-29', '2026-12-30']), total_days: 2 })
      const later = await world.addRequest(world.nurse, { status: 'approved', period: { start: '2027-02-02', end: '2027-02-04' }, days: days(['2027-02-02', '2027-02-03', '2027-02-04']), total_days: 3 })
      const spanning = await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-29', end: '2027-01-02' }, days: days(['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']), total_days: 5, half_days: { first: false, last: true } })
      const before = await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-01', end: '2026-12-03' }, days: days(['2026-12-01', '2026-12-02', '2026-12-03']), total_days: 3 })
      for (const [request, count] of [[later, 3], [spanning, 5], [before, 3]] as const) {
        await world.post(world.nurse, 'use', 0 - count, { source: { kind: 'request', ref_id: request.id, date: null } })
      }
      const separation = await addSeparation()

      const result = await complete(separation.id)

      const status = async (id: string) => (await world.repos.requests.findOne(id))?.status
      expect(await status(pending.id)).toBe('cancelled')
      expect(await status(head.id)).toBe('cancelled')
      expect(await status(later.id)).toBe('cancelled')
      expect(await status(before.id)).toBe('approved')
      expect(await world.repos.requests.findOne(spanning.id)).toMatchObject({ status: 'approved', period: { start: '2026-12-29', end: DAY }, total_days: 3, half_days: { first: false, last: false } })
      const reversed = async (id: string) => (await world.repos.ledger.findByRequest(world.tenantId, id)).filter((entry) => entry.kind === 'reversal').reduce((sum, entry) => sum + entry.days, 0)
      expect(await reversed(later.id)).toBe(3)
      expect(await reversed(spanning.id)).toBe(2)
      expect(await reversed(before.id)).toBe(0)
      expect(result.completion?.counts.leave_requests).toBe(4)
    })

    it('settles the days left of each yearly leave type, negative when more was taken than earned', async () => {
      const used = await world.addRequest(world.nurse, { status: 'approved', period: { start: '2026-12-01', end: '2026-12-03' }, days: days(['2026-12-01', '2026-12-02', '2026-12-03']), total_days: 3 })
      await world.post(world.nurse, 'use', -3, { source: { kind: 'request', ref_id: used.id, date: null } })
      const overdrawn = await world.addEmployee()
      await world.post(overdrawn, 'grant', 2)
      await world.post(overdrawn, 'adjustment', -3.5)
      const first = await addSeparation()
      const second = await addSeparation({}, overdrawn.id)

      const one = await complete(first.id)
      const two = await complete(second.id)

      expect(one.settlement).toEqual({ leave: [{ leave_type: { system: 'id.leave-type', code: 'tahunan' }, period: { start: '2026-03-15', end: '2027-03-14' }, days_left: 9 }], notes: null })
      expect(two.settlement?.leave[0]?.days_left).toBe(-1.5)
    })
  })

  describe('clinical standing', () => {
    it('revokes the current SPKs and their grants from the next day, flags the supervised grants and withdraws open applications', async () => {
      const spk = await world.seed(() => appointments.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, appointment_number: 'SPK-1', valid_period: { start: '2026-01-01', end: '2028-12-31' }, status: 'active', is_current: true, revocation: null } as never))
      const full = await world.seed(() => grants.create({ tenant_id: world.tenantId, appointment_id: spk.id, catalog_item_id: new Types.ObjectId().toHexString(), code: 'G1', condition: 'full', status: 'active', status_change: null, supervisor: null, flag: null } as never))
      const other = await world.addEmployee()
      const otherSpk = await world.seed(() => appointments.create({ tenant_id: world.tenantId, employee_id: other.id, appointment_number: 'SPK-2', valid_period: { start: '2026-01-01', end: '2028-12-31' }, status: 'active', is_current: true, revocation: null } as never))
      const supervised = await world.seed(() => grants.create({ tenant_id: world.tenantId, appointment_id: otherSpk.id, catalog_item_id: new Types.ObjectId().toHexString(), code: 'G2', condition: 'supervised', status: 'active', status_change: null, supervisor: { grant_id: full.id }, flag: null } as never))
      const open = await world.seed(() => applications.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, status: 'under_review', status_since: new Date('2026-12-01T00:00:00Z'), withdrawal_reason: null } as never))
      const decided = await world.seed(() => applications.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, status: 'approved', status_since: new Date('2026-06-01T00:00:00Z'), withdrawal_reason: null } as never))
      const separation = await addSeparation()

      const result = await complete(separation.id)

      expect(await appointments.findOne(spk.id)).toMatchObject({ status: 'revoked', is_current: false, revocation: { effective_date: '2027-01-01', reason: 'separation', decision_ref: null } })
      expect(await grants.findOne(full.id)).toMatchObject({ status: 'revoked', status_change: { effective_date: '2027-01-01' } })
      expect((await grants.findOne(supervised.id))?.flag).toMatchObject({ reason: 'supervisor_lost_privilege' })
      expect((await appointments.findOne(otherSpk.id))?.status).toBe('active')
      expect(await applications.findOne(open.id)).toMatchObject({ status: 'withdrawn', withdrawal_reason: 'separation' })
      expect((await applications.findOne(decided.id))?.status).toBe('approved')
      expect(result.completion?.counts.appointments).toBe(1)
    })
  })

  describe('seats, positions and the contract', () => {
    it('ends the committee seats and position assignments on the last working day', async () => {
      const seat = await world.seed(() => memberships.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, facility_id: world.facilityId, committee: { system: 'id.committee', code: 'etik' }, role: { system: 'id.committee-role', code: 'member' }, status: 'active', period: { start: '2026-01-01', end: null } } as never))
      const separation = await addSeparation()
      const before = await world.repos.assignments.findOpenByEmployee(world.tenantId, world.nurse.id)

      const result = await complete(separation.id)

      expect((await memberships.findActiveByEmployee(world.tenantId, world.nurse.id))).toEqual([])
      expect(await memberships.findOne(seat.id)).toMatchObject({ status: 'ended', period: { start: '2026-01-01', end: DAY } })
      expect(await world.repos.assignments.findOpenByEmployee(world.tenantId, world.nurse.id)).toEqual([])
      expect((await world.repos.assignments.findOne(before[0]!.id))).toMatchObject({ status: 'ended', is_open: false, period: { end: DAY } })
      expect(result.completion?.counts).toMatchObject({ memberships: 1, position_assignments: before.length })
    })

    it('ends the contract for an ending type and terminates it for a dismissal, with the contract event', async () => {
      const dismissed = await world.addEmployee()
      const ending = await addSeparation()
      const terminating = await addSeparation({ type: dismissal, contract_action: 'terminate' }, dismissed.id)
      const contractOf = async (employeeId: string) => (await world.repos.contracts.findByEmployee(world.tenantId, employeeId))[0]!

      await complete(ending.id)
      await complete(terminating.id)

      expect(await contractOf(world.nurse.id)).toMatchObject({ status: 'ended' })
      expect((await contractOf(world.nurse.id)).period.end).toBe(DAY)
      expect(await contractOf(dismissed.id)).toMatchObject({ status: 'terminated', termination: { date: DAY, reason: dismissal, notes: null } })
      expect(appended.map((event) => event.type)).toEqual(expect.arrayContaining(['workforce.contract.ended', 'workforce.contract.terminated']))
    })
  })

  describe('the employee and the separation', () => {
    it('sets the employee separated on the last working day, clears the summaries and writes one status event', async () => {
      const separation = await addSeparation()

      const done = await complete(separation.id)

      expect(await world.repos.employees.findOne(world.nurse.id)).toMatchObject({ employment_status: 'separated', employment_status_since: DAY, separation_date: DAY, current_employment: null, primary_assignment: null })
      const status = appended.filter((event) => event.type === 'workforce.employee.status_changed')
      expect(status).toHaveLength(1)
      expect(status[0]?.payload).toEqual({ employee_id: world.nurse.id, from_status: 'active', to_status: 'separated', effective_date: DAY })
      expect(status[0]?.correlationId).toBe('job-1')
      expect(done).toMatchObject({ status: 'completed', completion: { by: { account_id: 'separation-job' }, counts: { assignments: 0, sessions: 0, leave_requests: 0, appointments: 0, memberships: 0, position_assignments: expect.any(Number) } } })
      expect(done.completion?.at).toBeInstanceOf(Date)
    })

    it('logs counts only, and refuses a second completion, a cancelled separation, a missing or foreign one and no actor', async () => {
      const separation = await addSeparation()
      await complete(separation.id)
      expect(world.logs.log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'separation_complete', outcome: 'success' })
      for (const text of [DAY, world.nurse.id, 'resignation']) {
        expect(world.logs.written()).not.toContain(text)
      }
      const cancelled = await addSeparation({ status: 'cancelled' }, (await world.addEmployee()).id)
      const code = async (work: () => Promise<unknown>) => ((await rejection(work)) as { code: string }).code

      expect(await code(() => complete(separation.id))).toBe('separation_not_planned')
      expect(await code(() => complete(cancelled.id))).toBe('separation_not_planned')
      expect(await code(() => complete(new Types.ObjectId().toHexString()))).toBe('separation_not_found')
      expect(await code(() => complete('bad'))).toBe('separation_not_found')
      expect(await code(() => complete(separation.id, world.otherTenantId))).toBe('separation_not_found')
      expect(await code(() => service.complete(world.tenantId, separation.id))).toBe('actor_required')
      expect(appended.filter((event) => event.type === 'workforce.employee.status_changed')).toHaveLength(1)
    })

    it('never touches the records of another tenant or of another employee', async () => {
      const bystander = await world.addEmployee()
      const roster = await world.addRoster(await world.addUnit(world.parent), { start: '2027-01-04', end: '2027-01-10' }, 'draft', { employee: bystander, dates: ['2027-01-05'] })
      const separation = await addSeparation()

      await complete(separation.id)

      expect((await world.repos.rosterAssignments.findByRoster(world.tenantId, roster.id))[0]?.status).toBe('planned')
      expect((await world.repos.employees.findOne(bystander.id))?.employment_status).toBe('active')
    })
  })

  describe('completeImmediate', () => {
    it('completes an immediate separation that is still planned, and refuses one that is not immediate', async () => {
      const immediate = await addSeparation({ immediate: true, type: dismissal, contract_action: 'terminate' }, (await world.addEmployee()).id)
      const planned = await addSeparation()

      const done = await asJob(() => service.completeImmediate(world.tenantId, immediate.id))
      const refused = await rejection(() => asJob(() => service.completeImmediate(world.tenantId, planned.id)))
      const missing = await rejection(() => asJob(() => service.completeImmediate(world.tenantId, 'bad')))

      expect(done.status).toBe('completed')
      expect((refused as { code: string }).code).toBe('separation_not_immediate')
      expect((missing as { code: string }).code).toBe('separation_not_found')
      expect((await world.repos.separations.findOne(planned.id))?.status).toBe('planned')
    })
  })

  it('leaves the separation planned when a step fails, so the next pass completes it (the in-memory fakes cannot roll back, so earlier steps are not checked)', async () => {
    const separation = await addSeparation()
    const original = world.repos.employees.update.bind(world.repos.employees)
    world.repos.employees.update = (async () => {
      throw new Error('storage down')
    }) as never

    const thrown = await rejection(() => complete(separation.id))
    world.repos.employees.update = original

    expect(thrown).toBeInstanceOf(Error)
    expect((await world.repos.separations.findOne(separation.id))?.status).toBe('planned')
    expect(await rejection(() => asJob(() => service.complete(world.tenantId, separation.id)))).toBeUndefined()
    expect((await world.repos.separations.findOne(separation.id))?.status).toBe('completed')
  })
})
