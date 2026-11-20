import { Types } from 'mongoose'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { InMemoryPracticeScheduleExceptions, InMemoryPracticeSchedules } from '../testing/in-memory'
import { LeavePlaceService } from './leave-place'
import { RosterLeaveEffects } from './roster-leave-effects'
import type { LeaveDay, LeaveRequest } from '@repository/model/leave-request'

describe('RosterLeaveEffects', () => {
  let world: LeaveWorld
  let schedules: InMemoryPracticeSchedules
  let exceptions: InMemoryPracticeScheduleExceptions
  let effects: RosterLeaveEffects

  /**
   * Whole days of a leave, all counted.
   *
   * @param dates - The dates.
   * @param count - What each counts.
   * @returns The breakdown.
   */
  function days(dates: string[], count: LeaveDay['count'] = 1): LeaveDay[] {
    return dates.map((date) => ({ date, count, why: 'working' as const, set_by: 'working_week' as const }))
  }

  /**
   * An approved request of the nurse.
   *
   * @param dates - The leave dates.
   * @param override - Other fields.
   * @returns The request.
   */
  function approved(dates: string[], override: Partial<LeaveRequest> = {}) {
    return world.addRequest(world.nurse, { status: 'approved', period: { start: dates[0]!, end: dates.at(-1)! }, days: days(dates), total_days: dates.length, ...override })
  }

  /**
   * Adds a weekly session of the nurse (a stand-in for a doctor) on a weekday.
   *
   * @param dayOfWeek - ISO weekday.
   * @param period - Validity.
   * @param employee - The employee.
   * @returns The schedule.
   */
  function addSchedule(dayOfWeek: number, period = { start: '2026-01-01', end: null as string | null }, employee = world.nurse) {
    return world.seed(() =>
      schedules.create({ tenant_id: world.tenantId, employee_id: employee.id, unit_id: world.ward.id, facility_id: world.facilityId, day_of_week: dayOfWeek, start_time: '08:00', end_time: '12:00', quota: null, period, status: 'active' }),
    )
  }

  /**
   * Runs the effect as the approval does.
   *
   * @param request - The request.
   */
  async function approve(request: LeaveRequest) {
    await world.seed(() => effects.onApproved(request))
    return (await world.repos.requests.findOne(request.id))!
  }

  /**
   * The assignments of an employee in a roster.
   *
   * @param rosterId - The roster.
   */
  function assignmentsOf(rosterId: string) {
    return world.repos.rosterAssignments.findByRoster(world.tenantId, rosterId)
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T05:00:00Z'))
    world = await createLeaveWorld()
    schedules = new InMemoryPracticeSchedules()
    exceptions = new InMemoryPracticeScheduleExceptions()
    effects = new RosterLeaveEffects(world.repos.requests, world.repos.rosters, world.repos.rosterAssignments, schedules, exceptions, new LeavePlaceService(world.repos.assignments, world.repos.units, world.repos.facilities))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('onApproved: shifts', () => {
    it('cancels the full days in a draft roster and keeps the cancelled ids on the request', async () => {
      const roster = await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-07' }, 'draft', { employee: world.nurse, dates: ['2026-12-01', '2026-12-02', '2026-12-05'] })
      const request = await approved(['2026-12-01', '2026-12-02', '2026-12-03'])

      const stored = await approve(request)

      const all = await assignmentsOf(roster.id)
      expect(all.filter((item) => item.status === 'cancelled').map((item) => item.date).sort()).toEqual(['2026-12-01', '2026-12-02'])
      expect(all.find((item) => item.date === '2026-12-05')?.status).toBe('planned')
      for (const item of all.filter((entry) => entry.status === 'cancelled')) {
        expect(item).toMatchObject({ cancellation: { kind: 'leave', ref_id: request.id }, change_reason: 'leave' })
      }
      expect(stored.cover?.cancelled_assignment_ids.sort()).toEqual(all.filter((item) => item.status === 'cancelled').map((item) => item.id).sort())
      expect(stored.cover?.confirmed).toBeNull()
      expect((await world.repos.rosters.findOne(roster.id))?.revision).toBe(1)
    })

    it('raises the revision of a published roster once and the cancelled assignments carry it', async () => {
      const roster = await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-07' }, 'published', { employee: world.nurse, dates: ['2026-12-01', '2026-12-02'] })
      const request = await approved(['2026-12-01', '2026-12-02'])

      await approve(request)

      expect((await world.repos.rosters.findOne(roster.id))?.revision).toBe(2)
      expect((await assignmentsOf(roster.id)).map((item) => [item.status, item.revision])).toEqual([['cancelled', 2], ['cancelled', 2]])
    })

    it('clears the validation of a submitted or approved roster, so it has to be validated again', async () => {
      const submitted = await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-02' }, 'submitted', { employee: world.nurse, dates: ['2026-12-01'] })
      const checked = await world.addRoster(world.ward, { start: '2026-12-03', end: '2026-12-04' }, 'approved', { employee: world.nurse, dates: ['2026-12-03'] })
      for (const roster of [submitted, checked]) {
        await world.seed(() => world.repos.rosters.update(roster.id, { validation: { checked_at: new Date(), violations: 0, coverage_gaps: 0 } }))
      }

      await approve(await approved(['2026-12-01', '2026-12-03']))

      for (const roster of [submitted, checked]) {
        const stored = await world.repos.rosters.findOne(roster.id)
        expect(stored?.validation).toBeNull()
        expect(stored?.revision).toBe(1)
        expect((await assignmentsOf(roster.id))[0]?.status).toBe('cancelled')
      }
    })

    it('leaves a closed roster alone and still succeeds, and cancels past dates of an after-the-fact leave', async () => {
      const closed = await world.addRoster(world.ward, { start: '2026-11-10', end: '2026-11-12' }, 'closed', { employee: world.nurse, dates: ['2026-11-10'] })
      const open = await world.addRoster(world.ward, { start: '2026-11-13', end: '2026-11-15' }, 'published', { employee: world.nurse, dates: ['2026-11-13'] })

      const stored = await approve(await approved(['2026-11-10', '2026-11-13']))

      expect((await assignmentsOf(closed.id))[0]?.status).toBe('planned')
      expect((await assignmentsOf(open.id))[0]?.status).toBe('cancelled')
      expect(stored.cover?.cancelled_assignment_ids).toHaveLength(1)
    })

    it('cancels nothing for half days and a day that does not count, and leaves other people and a day off', async () => {
      const colleague = await world.addEmployee()
      const otherWard = await world.addUnit(world.parent)
      const theirs = await world.addRoster(otherWard, { start: '2026-12-01', end: '2026-12-02' }, 'draft', { employee: colleague, dates: ['2026-12-01'] })
      const roster = await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-04' }, 'draft', { employee: world.nurse, dates: ['2026-12-01', '2026-12-03'], off: ['2026-12-02'] })
      const request = await approved(['2026-12-01', '2026-12-02', '2026-12-03'], { days: [...days(['2026-12-01'], 0.5), ...days(['2026-12-02', '2026-12-03'], 0)] })

      const stored = await approve(request)

      expect((await assignmentsOf(roster.id)).every((item) => item.status === 'planned')).toBe(true)
      expect((await assignmentsOf(theirs.id))[0]?.status).toBe('planned')
      expect(stored.cover).toEqual({ cancelled_assignment_ids: [], confirmed: null })
    })

    it('never reads or changes the records of another tenant', async () => {
      const foreignUnit = await world.addUnit()
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })
      const foreignRoster = await world.seed(() => world.repos.rosters.create({ tenant_id: world.otherTenantId, unit_id: foreignUnit.id, facility_id: world.facilityId, period: { start: '2026-12-01', end: '2026-12-02' }, status: 'published', revision: 1, prepared_by: { account_id: 'x', display_name: 'X', kind: 'account' }, submitted: null, approved: null, published: null, closed: null, return_reason: null, coverage_overrides: [], validation: null }))
      await world.seed(() => world.repos.rosterAssignments.create({ tenant_id: world.otherTenantId, roster_id: foreignRoster.id, unit_id: foreignUnit.id, facility_id: world.facilityId, employee_id: world.nurse.id, date: '2026-12-01', shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2026-12-01T00:00:00Z'), ends_at: new Date('2026-12-01T08:00:00Z'), role: 'staff', status: 'planned', source: { kind: 'roster', ref_id: null }, cancellation: null, change_reason: null, revision: 1, overtime: null, flag: null, is_flagged: false }))
      expect(foreign.tenant_id).toBe(world.otherTenantId)

      await approve(await approved(['2026-12-01']))

      expect((await assignmentsOf(foreignRoster.id)).length).toBe(0)
      expect((await world.repos.rosterAssignments.findOne((await world.repos.rosterAssignments.findPlannedByEmployeeBetween(world.otherTenantId, world.nurse.id, '2026-12-01', '2026-12-01'))[0]!.id))?.status).toBe('planned')
      expect((await world.repos.rosters.findOne(foreignRoster.id))?.revision).toBe(1)
    })
  })

  describe('onApproved: practice sessions', () => {
    it('cancels the sessions that fall on full leave days, past ones too, with an exception that names the leave only', async () => {
      const monday = await addSchedule(1)
      const request = await approved(['2026-11-16', '2026-11-23', '2026-11-24'])

      await approve(request)

      const made = await exceptions.findByLeave(world.tenantId, request.id)
      expect(made.map((item) => [item.schedule_id, item.date, item.kind, item.reason, item.moved_to, item.source])).toEqual([
        [monday.id, '2026-11-16', 'cancelled', null, null, { kind: 'leave', ref_id: request.id }],
        [monday.id, '2026-11-23', 'cancelled', null, null, { kind: 'leave', ref_id: request.id }],
      ])
      expect(made[0]).toMatchObject({ employee_id: world.nurse.id, unit_id: world.ward.id })
    })

    it('skips a date that already has an exception, a schedule outside its validity and one of another weekday or person', async () => {
      const monday = await addSchedule(1)
      await addSchedule(1, { start: '2027-01-01', end: null })
      await addSchedule(2)
      await addSchedule(1, { start: '2026-01-01', end: null }, world.headU)
      await world.seed(() => exceptions.create({ tenant_id: world.tenantId, schedule_id: monday.id, employee_id: world.nurse.id, unit_id: world.ward.id, date: '2026-11-23', kind: 'cancelled', moved_to: null, reason: { system: 'id.practice-exception-reason', code: 'training' }, source: { kind: 'manual', ref_id: null } }))
      const request = await approved(['2026-11-23', '2026-11-30'])

      await approve(request)

      const made = await exceptions.findByLeave(world.tenantId, request.id)
      expect(made.map((item) => item.date)).toEqual(['2026-11-30'])
    })

    it('serves the sessions of an ended schedule up to its last date', async () => {
      await addSchedule(1, { start: '2026-01-01', end: '2026-11-23' })
      const request = await approved(['2026-11-23', '2026-11-30'])

      await approve(request)

      expect((await exceptions.findByLeave(world.tenantId, request.id)).map((item) => item.date)).toEqual(['2026-11-23'])
    })
  })

  describe('onCancelled', () => {
    it('undoes only the exceptions of this request dated today or later, and restores no assignment', async () => {
      await addSchedule(1)
      const roster = await world.addRoster(world.ward, { start: '2026-11-30', end: '2026-12-01' }, 'draft', { employee: world.nurse, dates: ['2026-11-30'] })
      const request = await approved(['2026-11-16', '2026-11-30', '2026-12-07'])
      const other = await approved(['2027-01-04'], { period: { start: '2027-01-04', end: '2027-01-04' } })
      await approve(request)
      await approve(other)

      await world.seed(() => effects.onCancelled(request))

      expect((await exceptions.findByLeave(world.tenantId, request.id)).map((item) => item.date)).toEqual(['2026-11-16'])
      expect((await exceptions.findByLeave(world.tenantId, other.id)).map((item) => item.date)).toEqual(['2027-01-04'])
      expect((await assignmentsOf(roster.id))[0]?.status).toBe('cancelled')
    })

    it('does nothing for a leave that made no exception', async () => {
      const request = await approved(['2026-12-01'])

      await expect(world.seed(() => effects.onCancelled(request))).resolves.toBeUndefined()
    })
  })
})
