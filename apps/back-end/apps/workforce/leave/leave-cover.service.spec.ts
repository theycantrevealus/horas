import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import type { Employee } from '@repository/model/employee'
import type { LeaveDay } from '@repository/model/leave-request'
import { InMemoryPracticeScheduleExceptions } from '../testing/in-memory'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, ForbiddenError, InvalidRequestError, NotFoundError } from '../workforce.error'
import { LeaveCalendar } from './leave-calendar'
import { LeaveCoverService } from './leave-cover.service'
import { LeavePlaceService } from './leave-place'

describe('LeaveCoverService', () => {
  let world: LeaveWorld
  let service: LeaveCoverService
  let exceptions: InMemoryPracticeScheduleExceptions
  let eligible: { value: { eligible: boolean; failed?: string } }
  const limits: Record<string, number> = { MIN_REST_HOURS: 8, MAX_WEEKLY_HOURS: 40, MAX_OVERTIME_HOURS_WEEK: 18, MAX_CONSECUTIVE_NIGHTS: 3 }

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
   * The Head of the nurse's ward, as a caller.
   */
  function head() {
    return world.caller({ accountId: 'head', employeeId: world.headU.id, canDecide: true })
  }

  /**
   * Runs `work` as the account of a caller.
   *
   * @param who - The caller.
   * @param work - The call.
   * @returns What `work` returns.
   */
  function as<T>(who: ReturnType<LeaveWorld['caller']>, work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c', actor: { account_id: who.accountId, display_name: 'X', kind: 'account' } }, work)
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
   * An approved leave of the nurse whose shifts are cancelled, with the cover kept on the request.
   *
   * @param shifts - The dates of the cancelled shifts, with the status of the roster each is in.
   * @param options - The replacement and other fields of the request.
   * @returns The request, the replacement and the cancelled assignments by date.
   */
  async function scenario(shifts: [string, 'draft' | 'published' | 'submitted' | 'closed'][], options: { replacement?: Employee | null; override?: object } = {}) {
    const replacement = options.replacement === undefined ? await world.addEmployee() : options.replacement
    const dates = shifts.map(([date]) => date)
    const request = await world.addRequest(world.nurse, {
      status: 'approved',
      policy_id: world.annualPolicy.id,
      period: { start: dates[0]!, end: dates.at(-1)! },
      days: days(dates),
      total_days: dates.length,
      deciders: { first: { kind: 'unit_head', unit_id: world.ward.id, employee_id: null }, second: false },
      replacement: { employee_id: replacement?.id ?? null, none_reason: replacement ? null : 'Tidak ada' },
      ...options.override,
    })
    const byDate = new Map<string, string>()
    const rosters = new Map<string, string>()
    let index = 0
    for (const [date, status] of shifts) {
      index += 1
      // One roster per shift, each in its own unit-less month window so the fakes do not clash.
      const unit = index === 1 ? world.ward : await world.addUnit(world.parent)
      const roster = await world.addRoster(unit, { start: date, end: date }, status as never, { employee: world.nurse, dates: [date] })
      rosters.set(date, roster.id)
      const [assignment] = await world.repos.rosterAssignments.findByRoster(world.tenantId, roster.id)
      await world.seed(() => world.repos.rosterAssignments.update(assignment!.id, { status: 'cancelled', cancellation: { kind: 'leave', ref_id: request.id } }))
      byDate.set(date, assignment!.id)
    }
    await world.seed(() => world.repos.requests.update(request.id, { cover: { cancelled_assignment_ids: [...byDate.values()], confirmed: null } }))
    return { request: (await world.repos.requests.findOne(request.id))!, replacement, byDate, rosters }
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T05:00:00Z'))
    world = await createLeaveWorld()
    exceptions = new InMemoryPracticeScheduleExceptions()
    eligible = { value: { eligible: true } }
    const parameters = { resolve: async (_tenant: string, { key }: { key: string }) => ({ value: limits[key] }) }
    const place = new LeavePlaceService(world.repos.assignments, world.repos.units, world.repos.facilities)
    service = new LeaveCoverService(
      world.repos.requests, world.repos.rosterAssignments, world.repos.rosters, world.repos.units, world.repos.employees, exceptions,
      { general: async () => eligible.value } as never, parameters as never, new LeaveCalendar(world.repos.requests), world.services.decider, place,
      { run: (work: () => Promise<unknown>) => work() } as never, { log: world.logs.log, warn: world.logs.warn, error: world.logs.error, debug: world.logs.debug } as never,
    )
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('proposal', () => {
    it('lists the cancelled shifts by date and marks the ones that cannot be given: past, locked and closed', async () => {
      const { request, byDate } = await scenario([['2026-11-10', 'draft'], ['2026-12-01', 'published'], ['2026-12-02', 'draft'], ['2026-12-03', 'submitted'], ['2026-12-04', 'closed']])

      const proposal = await as(head(), () => service.proposal(world.tenantId, request.id, head()))

      expect(proposal.items.map((item) => [item.assignmentId, item.date, item.status])).toEqual([
        [byDate.get('2026-11-10'), '2026-11-10', 'past'],
        [byDate.get('2026-12-01'), '2026-12-01', 'available'],
        [byDate.get('2026-12-02'), '2026-12-02', 'available'],
        [byDate.get('2026-12-03'), '2026-12-03', 'roster_locked'],
        [byDate.get('2026-12-04'), '2026-12-04', 'roster_closed'],
      ])
      expect(proposal).toMatchObject({ confirmed: false, movedInSessions: [] })
      expect(proposal.items[1]).toMatchObject({ shiftCode: 'P', role: 'staff' })
      expect(world.logs.log).not.toHaveBeenCalled()
    })

    it('checks every shift as a shift the replacement is added to by hand, naming the first rule broken', async () => {
      const suspended = await world.addEmployee({ status: 'suspended' })
      const gone = await scenario([['2026-12-01', 'draft']], { replacement: suspended })
      expect((await as(head(), () => service.proposal(world.tenantId, gone.request.id, head()))).items[0]?.status).toBe('employee_not_assignable')
    })

    it('refuses a replacement on leave, one who already works that day in the roster, one with no eligibility and one who would work overtime', async () => {
      const first = await scenario([['2026-12-01', 'draft']])
      await world.addRequest(first.replacement!, { status: 'approved', period: { start: '2026-12-01', end: '2026-12-01' }, days: days(['2026-12-01']) })
      expect((await as(head(), () => service.proposal(world.tenantId, first.request.id, head()))).items[0]?.status).toBe('on_leave')

      const same = await scenario([['2026-12-22', 'draft']])
      await world.seed(() => world.repos.rosterAssignments.create({ tenant_id: world.tenantId, roster_id: same.rosters.get('2026-12-22')!, unit_id: world.ward.id, facility_id: world.facilityId, employee_id: same.replacement!.id, date: '2026-12-22', shift: { definition_id: new Types.ObjectId().toHexString(), code: 'S', type: 'regular', start_time: '14:00', end_time: '22:00', paid_minutes: 480, is_night: false }, starts_at: new Date('2026-12-22T07:00:00Z'), ends_at: new Date('2026-12-22T15:00:00Z'), role: 'staff', status: 'planned', source: { kind: 'roster', ref_id: null }, cancellation: null, change_reason: null, revision: 1, overtime: null, flag: null, is_flagged: false }))
      expect((await as(head(), () => service.proposal(world.tenantId, same.request.id, head()))).items[0]?.status).toBe('assignment_exists')

      const busy = await world.addEmployee()
      const second = await scenario([['2026-12-08', 'draft']], { replacement: busy })
      for (const [index, date] of ['2026-12-07', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12'].entries()) {
        await world.addRoster(await world.addUnit(world.parent), { start: `2026-12-${String(index + 20)}`, end: `2026-12-${String(index + 20)}` }, 'published', { employee: busy, dates: [date] })
      }
      expect((await as(head(), () => service.proposal(world.tenantId, second.request.id, head()))).items[0]?.status).toBe('overtime_consent_required')

      const third = await scenario([['2026-12-15', 'draft']])
      await world.seed(() => world.repos.employees.update(third.replacement!.id, { is_clinical: true }))
      await world.seed(() => world.repos.units.update(world.ward.id, { is_clinical: true }))
      eligible.value = { eligible: false, failed: 'sip' }
      expect((await as(head(), () => service.proposal(world.tenantId, third.request.id, head()))).items[0]?.status).toBe('not_eligible_sip')
    })

    it('says no_replacement for every item when the Head named none, and lists sessions moved onto a leave day by hand', async () => {
      const { request } = await scenario([['2026-12-01', 'draft']], { replacement: null })
      await world.seed(() => exceptions.create({ tenant_id: world.tenantId, schedule_id: new Types.ObjectId().toHexString(), employee_id: world.nurse.id, unit_id: world.ward.id, date: '2026-11-24', kind: 'moved', moved_to: { date: '2026-12-01', start_time: '09:00', end_time: '10:00' }, reason: { system: 'id.practice-exception-reason', code: 'other' }, source: { kind: 'manual', ref_id: null } }))

      const proposal = await as(head(), () => service.proposal(world.tenantId, request.id, head()))

      expect(proposal.items.map((item) => item.status)).toEqual(['no_replacement'])
      expect(proposal.movedInSessions).toMatchObject([{ date: '2026-12-01', startTime: '09:00', endTime: '10:00' }])
    })

    it('is for the first-step decider and a reader, 404 for anyone else, and only for an approved leave', async () => {
      const { request } = await scenario([['2026-12-01', 'draft']])
      const reader = world.caller({ accountId: 'r', canRead: true })
      const other = world.caller({ accountId: 'o', employeeId: world.headP.id, canDecide: true })

      expect((await as(reader, () => service.proposal(world.tenantId, request.id, reader))).items).toHaveLength(1)
      expect(await rejection(() => service.proposal(world.tenantId, request.id, other))).toBeInstanceOf(NotFoundError)
      expect(await rejection(() => service.proposal(world.otherTenantId, request.id, reader))).toBeInstanceOf(NotFoundError)
      expect(await rejection(() => service.proposal(world.tenantId, 'bad', reader))).toBeInstanceOf(NotFoundError)
      await world.seed(() => world.repos.requests.update(request.id, { status: 'requested' }))
      expect(((await rejection(() => service.proposal(world.tenantId, request.id, reader))) as InvalidRequestError).code).toBe('invalid_transition')
    })
  })

  describe('confirm', () => {
    it('creates the assignments of the replacement with the shift snapshot, the source leave_cover and the old role, and stores who confirmed', async () => {
      const { request, replacement, byDate, rosters } = await scenario([['2026-12-01', 'draft']])
      const old = (await world.repos.rosterAssignments.findOne(byDate.get('2026-12-01')!))!
      vi.clearAllMocks()

      const result = await as(head(), () => service.confirm(world.tenantId, request.id, { items: [{ assignmentId: old.id }] }, head()))

      expect(result.refused).toEqual([])
      const created = (await world.repos.rosterAssignments.findOne(result.created[0]!))!
      expect(created).toMatchObject({ employee_id: replacement!.id, roster_id: rosters.get('2026-12-01'), date: '2026-12-01', shift: old.shift, starts_at: old.starts_at, ends_at: old.ends_at, role: 'staff', status: 'planned', source: { kind: 'leave_cover', ref_id: request.id }, cancellation: null, overtime: null })
      const stored = await world.repos.requests.findOne(request.id)
      expect(stored?.cover?.confirmed).toMatchObject({ by: { account_id: 'head' }, created_assignment_ids: result.created })
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_cover_confirm', outcome: 'success', created: 1, refused: 0 })
      for (const text of [replacement!.id, '2026-12-01', 'Tidak']) {
        expect(world.logs.written()).not.toContain(text)
      }
    })

    it('raises the revision of a published roster once, and gives another role when one is asked for', async () => {
      const { request, byDate, rosters } = await scenario([['2026-12-01', 'published']])
      const before = (await world.repos.rosters.findOne(rosters.get('2026-12-01')!))!.revision

      const result = await as(head(), () => service.confirm(world.tenantId, request.id, { items: [{ assignmentId: byDate.get('2026-12-01')!, role: 'team_leader' }] }, head()))

      expect((await world.repos.rosters.findOne(rosters.get('2026-12-01')!))?.revision).toBe(before + 1)
      expect(await world.repos.rosterAssignments.findOne(result.created[0]!)).toMatchObject({ role: 'team_leader', revision: before + 1, change_reason: 'leave_cover' })
    })

    it('reports the items that fail the checks and still creates the rest, and confirms only once', async () => {
      const { request, byDate } = await scenario([['2026-11-10', 'draft'], ['2026-12-01', 'draft'], ['2026-12-02', 'submitted']])

      const result = await as(head(), () => service.confirm(world.tenantId, request.id, { items: [...byDate.values()].map((assignmentId) => ({ assignmentId })) }, head()))

      expect(result.created).toHaveLength(1)
      expect(result.refused).toEqual([{ assignmentId: byDate.get('2026-11-10'), code: 'past' }, { assignmentId: byDate.get('2026-12-02'), code: 'roster_locked' }])
      const again = await rejection(() => as(head(), () => service.confirm(world.tenantId, request.id, { items: [{ assignmentId: byDate.get('2026-12-01')! }] }, head())))
      expect(again).toBeInstanceOf(ConflictError)
      expect((again as ConflictError).code).toBe('cover_confirmed')
    })

    it('is for the first-step decider only, needs a replacement and an approved leave, and a known version', async () => {
      const { request, byDate } = await scenario([['2026-12-01', 'draft']])
      const item = { assignmentId: byDate.get('2026-12-01')! }
      const reader = world.caller({ accountId: 'r', canRead: true })
      const requester = world.caller({ accountId: 'n', employeeId: world.nurse.id, canDecide: true })

      for (const who of [reader, requester, world.caller({ accountId: 'x', employeeId: world.headP.id, canDecide: true })]) {
        const thrown = await rejection(() => as(who, () => service.confirm(world.tenantId, request.id, { items: [item] }, who)))
        expect(thrown).toBeInstanceOf(ForbiddenError)
        expect((thrown as ForbiddenError).code).toBe('not_the_decider')
      }
      const stale = await rejection(() => as(head(), () => service.confirm(world.tenantId, request.id, { items: [item], version: 99 }, head())))
      expect((stale as ConflictError).code).toBe('stale_version')
      const none = await scenario([['2026-12-08', 'draft']], { replacement: null })
      const noReplacement = await rejection(() => as(head(), () => service.confirm(world.tenantId, none.request.id, { items: [{ assignmentId: none.byDate.get('2026-12-08')! }] }, head())))
      expect((noReplacement as InvalidRequestError).code).toBe('no_replacement')
      await world.seed(() => world.repos.requests.update(request.id, { status: 'cancelled' }))
      expect(((await rejection(() => as(head(), () => service.confirm(world.tenantId, request.id, { items: [item] }, head())))) as InvalidRequestError).code).toBe('invalid_transition')
    })

    it('accepts only shifts the leave cancelled, once each, with a valid role, and between 1 and 200 items', async () => {
      const { request, byDate } = await scenario([['2026-12-01', 'draft']])
      const mine = byDate.get('2026-12-01')!
      const code = async (items: unknown[]) => ((await rejection(() => as(head(), () => service.confirm(world.tenantId, request.id, { items } as never, head())))) as InvalidRequestError).code

      expect(await code([])).toBe('invalid_items')
      expect(await code(Array.from({ length: 201 }, () => ({ assignmentId: mine })))).toBe('invalid_items')
      expect(await code([{ assignmentId: new Types.ObjectId().toHexString() }])).toBe('not_in_cover')
      expect(await code([{ assignmentId: mine }, { assignmentId: mine }])).toBe('duplicate_item')
      expect(await code([{ assignmentId: mine, role: 'boss' }])).toBe('invalid_role')
      expect((await world.repos.requests.findOne(request.id))?.cover?.confirmed).toBeNull()
    })
  })
})
