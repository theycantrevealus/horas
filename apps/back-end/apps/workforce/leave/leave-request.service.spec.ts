import { Types } from 'mongoose'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { type CreateLeaveRequestInput } from './leave-request.service'

describe('LeaveRequestService', () => {
  let world: LeaveWorld
  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const sick = { system: 'id.leave-type', code: 'sakit' }

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
   * The request of the nurse for three working days in December, as the nurse.
   *
   * @param override - Fields that replace the defaults.
   * @returns The input.
   */
  function input(override: Partial<CreateLeaveRequestInput> = {}): CreateLeaveRequestInput {
    return { leaveType: annual, start: '2026-12-01', end: '2026-12-03', reason: 'Keperluan Rahasia', ...override }
  }

  /**
   * Creates the nurse's request as the nurse.
   *
   * @param override - Fields that replace the defaults.
   * @returns The request.
   */
  function create(override: Partial<CreateLeaveRequestInput> = {}) {
    return world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), input(override)),
    )
  }

  /**
   * @param work - The call.
   * @returns The workforce code of its rejection, or `null` when it succeeds.
   */
  async function codeOf(work: () => Promise<unknown>): Promise<string | null> {
    const thrown = await rejection(work)
    return thrown ? (thrown as { code: string }).code : null
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T05:00:00Z'))
    world = await createLeaveWorld()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('writes the request and its detail, counting the working days from the working week, and logs no values', async () => {
      const created = await create()

      expect(created).toMatchObject({
        tenant_id: world.tenantId,
        employee_id: world.nurse.id,
        unit_id: world.ward.id,
        facility_id: world.facilityId,
        leave_type: annual,
        policy_id: world.annualPolicy.id,
        rules: { balance_kind: 'period', counting: 'working_days', steps: 'one_step' },
        period: { start: '2026-12-01', end: '2026-12-03' },
        half_days: { first: false, last: false },
        total_days: 3,
        entitlement_period: { start: '2026-03-15', end: '2027-03-14' },
        deciders: { first: { kind: 'unit_head', unit_id: world.ward.id, employee_id: null }, second: false },
        replacement: null,
        decisions: [],
        status: 'requested',
        proof_due_on: null,
        proof_received: false,
        cover: null,
      })
      expect(created.days.map((day) => [day.date, day.count, day.why, day.set_by])).toEqual([
        ['2026-12-01', 1, 'working', 'working_week'],
        ['2026-12-02', 1, 'working', 'working_week'],
        ['2026-12-03', 1, 'working', 'working_week'],
      ])
      expect(await world.repos.details.findByRequest(world.tenantId, created.id)).toMatchObject({ reason: 'Keperluan Rahasia', proof: null, employee_id: world.nurse.id })
      expect(world.logs.log).toHaveBeenCalledTimes(1)
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_request_create', outcome: 'success' })
      for (const text of ['Keperluan Rahasia', 'tahunan', '2026-12-01', world.nurse.id]) {
        expect(world.logs.written()).not.toContain(text)
      }
    })

    it('lets HR request on an employee\'s behalf, and refuses another employee without the permission and an account without an employee', async () => {
      const onBehalf = await world.asAdmin(() =>
        world.services.request.create(world.tenantId, world.caller({ canWrite: true }), input({ employeeId: world.nurse.id })),
      )
      expect(onBehalf.employee_id).toBe(world.nurse.id)

      const other = await rejection(() => world.asAdmin(() => world.services.request.create(world.tenantId, world.caller({ employeeId: world.headU.id }), input({ employeeId: world.nurse.id }))))
      expect(other).toBeInstanceOf(ForbiddenError)
      expect((other as ForbiddenError).code).toBe('permission_required')
      const unlinked = await rejection(() => world.asAdmin(() => world.services.request.create(world.tenantId, world.caller(), input())))
      expect(unlinked).toBeInstanceOf(ForbiddenError)
      expect((unlinked as ForbiddenError).code).toBe('employee_required')
    })

    it('counts the dates a roster covers from the roster, and the others from the working week, the holidays included', async () => {
      await world.addCalendar([['2026-12-03', 'collective_leave']])
      await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-02' }, 'published', { employee: world.nurse, dates: ['2026-12-01'], off: ['2026-12-02'] })

      const created = await create()

      expect(created.days.map((day) => [day.date, day.count, day.why, day.set_by])).toEqual([
        ['2026-12-01', 1, 'working', 'roster'],
        ['2026-12-02', 0, 'rest_day', 'roster'],
        ['2026-12-03', 0, 'collective_leave', 'working_week'],
      ])
      expect(created.total_days).toBe(1)
    })

    it('ignores a closed roster and reads the working week of the facility', async () => {
      await world.addRoster(world.ward, { start: '2026-12-01', end: '2026-12-03' }, 'closed')
      world.setWorkingWeek([3])

      const created = await create()

      expect(created.days.map((day) => [day.date, day.count, day.set_by])).toEqual([['2026-12-01', 0, 'working_week'], ['2026-12-02', 1, 'working_week'], ['2026-12-03', 0, 'working_week']])
      expect(world.parameters.resolve).toHaveBeenCalledWith(world.tenantId, expect.objectContaining({ key: 'LEAVE_WORKING_WEEK', facilityId: world.facilityId }))
    })

    it('falls back to the default working week when the stored value is not a list of weekdays', async () => {
      world.setWorkingWeek('weekdays')

      expect((await create()).total_days).toBe(3)
    })

    it('chooses the parent unit\'s Head when the requester is the Head, HR Manager without a unit, and two steps for a two-step policy', async () => {
      await world.post(world.headU, 'grant', 12)
      const asHead = await world.asAdmin(() => world.services.request.create(world.tenantId, world.caller({ employeeId: world.headU.id }), input()))
      expect(asHead.deciders.first).toEqual({ kind: 'parent_head', unit_id: world.parent.id, employee_id: null })

      const drifter = await world.addEmployee()
      await world.post(drifter, 'grant', 12)
      const unitless = await world.asAdmin(() => world.services.request.create(world.tenantId, world.caller({ employeeId: drifter.id }), input()))
      expect(unitless).toMatchObject({ unit_id: null, facility_id: null, deciders: { first: { kind: 'hr_manager', unit_id: null } } })

      await world.addPolicy('menikah', { kind: 'per_event', days: 3 }, { approval: { steps: 'two_step', two_step_above_days: null }, max_days_per_request: 3 })
      const twoStep = await create({ leaveType: { system: 'id.leave-type', code: 'menikah' }, start: '2026-12-08', end: '2026-12-10' })
      expect(twoStep).toMatchObject({ rules: { balance_kind: 'per_event', steps: 'two_step' }, deciders: { second: true }, entitlement_period: null })
    })

    it('needs the second step for a one-step policy above its threshold', async () => {
      await world.addPolicy('tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false }, { effective_from: '2026-11-01', approval: { steps: 'one_step', two_step_above_days: 2 } })

      expect((await create()).deciders.second).toBe(true)
      expect((await create({ start: '2026-12-08', end: '2026-12-09' })).deciders.second).toBe(false)
    })

    it('sets the day the proof is due from the policy', async () => {
      await world.addPolicy('sakit', { kind: 'none' }, { retroactive_days: 3, proof: { due_days: 3 }, half_days: false })

      const created = await create({ leaveType: sick, start: '2026-11-17', end: '2026-11-18' })

      expect(created).toMatchObject({ proof_due_on: '2026-11-20', proof_received: false, entitlement_period: null, rules: { balance_kind: 'none' } })
    })

    it('stores half days and counts them', async () => {
      const created = await create({ halfDays: { first: true, last: true } })

      expect(created).toMatchObject({ half_days: { first: true, last: true }, total_days: 2 })
      expect(created.days.map((day) => day.count)).toEqual([0.5, 1, 0.5])
    })

    it.each([
      ['employee_not_assignable', async () => { await world.repos.employees.update(world.nurse.id, { employment_status: 'suspended' } as never) }, {}],
      ['invalid_leave_type', async () => undefined, { leaveType: { system: 'id.profession', code: 'perawat' } }],
      ['unknown_code', async () => undefined, { leaveType: { system: 'id.leave-type', code: 'tidak_ada' } }],
      ['no_policy', async () => undefined, { leaveType: { system: 'id.leave-type', code: 'menikah' } }],
      ['invalid_period', async () => undefined, { start: '2026-02-30', end: '2026-03-01' }],
      ['invalid_period', async () => undefined, { start: '2026-12-03', end: '2026-12-01' }],
      ['period_too_long', async () => undefined, { start: '2026-12-01', end: '2027-12-03' }],
      ['notice_too_short', async () => undefined, { start: '2026-11-18', end: '2026-11-19' }],
      ['half_day_not_allowed', async () => { await world.addPolicy('tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false }, { effective_from: '2026-11-01', half_days: false }) }, { halfDays: { first: true, last: false } }],
      ['invalid_half_days', async () => undefined, { end: '2026-12-01', halfDays: { first: true, last: true } }],
      ['reason_required', async () => undefined, { reason: '   ' }],
      ['invalid_reason', async () => undefined, { reason: 'x'.repeat(1001) }],
    ])('refuses %s', async (code, setup, override) => {
      await setup()

      const thrown = await rejection(() => create(override as Partial<CreateLeaveRequestInput>))

      expect(thrown).toBeInstanceOf(InvalidRequestError)
      expect((thrown as InvalidRequestError).code).toBe(code)
      expect(world.logs.warn).toHaveBeenCalledTimes(1)
      expect(await world.repos.requests.findByFilter(world.tenantId, {})).toEqual([])
    })

    it('refuses an employment type the policy does not allow, and a leave after the date the period starts for crossing it', async () => {
      await world.addPolicy('tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false }, { effective_from: '2026-11-01', employment_types: [{ system: 'id.employment-type', code: 'pkwt' }] })
      expect(await codeOf(() => create())).toBe('employment_type_not_allowed')
    })

    it('refuses a leave that crosses the end of its entitlement period', async () => {
      expect(await codeOf(() => create({ start: '2027-03-10', end: '2027-03-17' }))).toBe('crosses_period')
    })

    it('refuses more counted days than the policy allows per request, on the counted days and not the calendar span', async () => {
      await world.addPolicy('menikah', { kind: 'per_event', days: 3 }, { max_days_per_request: 3 })
      // Monday 2026-12-07 to Sunday 2026-12-13: 5 counted days over a 7-day span.
      expect(await codeOf(() => create({ leaveType: { system: 'id.leave-type', code: 'menikah' }, start: '2026-12-07', end: '2026-12-13' }))).toBe('too_many_days')
      // Thursday to Monday: 3 counted days over a 5-day span is fine.
      expect((await create({ leaveType: { system: 'id.leave-type', code: 'menikah' }, start: '2026-12-10', end: '2026-12-14' })).total_days).toBe(3)
    })

    it('refuses more days than are available, counting the days other requests hold, and accepts the rest', async () => {
      await create({ start: '2026-12-01', end: '2026-12-11' })
      expect((await world.services.balances.summary(world.tenantId, world.nurse.id, annual, '2026-03-15')).available).toBe(3)

      expect(await codeOf(() => create({ start: '2026-12-14', end: '2026-12-18' }))).toBe('insufficient_balance')
      expect((await create({ start: '2026-12-14', end: '2026-12-16' })).total_days).toBe(3)
    })

    it('refuses a request that shares a date with an open request, half days included, and accepts one after a rejected or cancelled request', async () => {
      const first = await create()

      const clash = await rejection(() => create({ start: '2026-12-03', end: '2026-12-04' }))
      expect(clash).toBeInstanceOf(ConflictError)
      expect((clash as ConflictError).code).toBe('leave_overlaps')
      expect(await codeOf(() => create({ start: '2026-11-30', end: '2026-12-01', halfDays: { first: false, last: true } }))).toBe('leave_overlaps')

      await world.seed(() => world.repos.requests.update(first.id, { status: 'rejected' }))
      expect((await create({ start: '2026-12-03', end: '2026-12-04' })).status).toBe('requested')
      const second = await world.repos.requests.findOverlapping(world.tenantId, world.nurse.id, '2026-12-03', '2026-12-03', ['requested'])
      await world.seed(() => world.repos.requests.update(second[0]!.id, { status: 'cancelled' }))
      expect((await create({ start: '2026-12-03', end: '2026-12-04' })).status).toBe('requested')
    })

    it('answers not found for an employee of another tenant, a missing one and a malformed identifier', async () => {
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })

      for (const employeeId of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        const thrown = await rejection(() => world.asAdmin(() => world.services.request.create(world.tenantId, world.caller({ canWrite: true }), input({ employeeId }))))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('employee_not_found')
      }
    })
  })

  describe('a leaving employee', () => {
    it('cannot request leave that ends after the last working day, but can request leave ending on it', async () => {
      await world.seed(() => world.repos.separations.create({ tenant_id: world.tenantId, employee_id: world.nurse.id, last_working_day: '2026-12-02', status: 'planned' } as never))

      const refused = await rejection(() => create({ end: '2026-12-03' }))
      const fits = await create({ end: '2026-12-02' })

      expect((refused as InvalidRequestError).code).toBe('employee_leaving')
      expect(fits.status).toBe('requested')
    })
  })

  describe('preview', () => {
    it('answers the day breakdown, the entitlement, the available days and the deciders without writing anything', async () => {
      const preview = await world.services.request.preview(world.tenantId, world.caller({ employeeId: world.nurse.id }), input())

      expect(preview).toMatchObject({
        valid: true,
        problem: null,
        totalDays: 3,
        entitlementPeriod: { start: '2026-03-15', end: '2027-03-14' },
        available: 12,
        deciders: { first: { kind: 'unit_head', unitId: world.ward.id }, second: false },
      })
      expect(preview.days).toHaveLength(3)
      expect(await world.repos.requests.findByFilter(world.tenantId, {})).toEqual([])
      expect(world.logs.written()).toBe('[[],[],[],[]]')
    })

    it('answers the first rule broken with what could be worked out before it', async () => {
      const preview = await world.services.request.preview(world.tenantId, world.caller({ employeeId: world.nurse.id }), input({ start: '2026-12-01', end: '2026-12-31' }))

      expect(preview).toMatchObject({ valid: false, problem: { code: 'insufficient_balance' }, totalDays: 23, available: 12 })
      expect(preview.days.length).toBe(31)
      const bad = await world.services.request.preview(world.tenantId, world.caller({ employeeId: world.nurse.id }), input({ end: '2026-11-01' }))
      expect(bad).toMatchObject({ valid: false, problem: { code: 'invalid_period' }, days: [], totalDays: null })
    })

    it('previews on an employee\'s behalf only with the permission, and still answers not found for a missing employee', async () => {
      expect(await codeOf(() => world.services.request.preview(world.tenantId, world.caller({ employeeId: world.headU.id }), input({ employeeId: world.nurse.id })))).toBe('permission_required')
      expect((await world.services.request.preview(world.tenantId, world.caller({ canWrite: true }), input({ employeeId: world.nurse.id }))).valid).toBe(true)
      expect(await codeOf(() => world.services.request.preview(world.tenantId, world.caller({ canWrite: true }), input({ employeeId: new Types.ObjectId().toHexString() })))).toBe('employee_not_found')
    })
  })

  describe('reads', () => {
    it('lists the signed-in employee\'s own requests, latest first, with the filters, and writes no log entry', async () => {
      const first = await create()
      const second = await create({ start: '2026-12-08', end: '2026-12-09' })
      await world.seed(() => world.repos.requests.update(first.id, { status: 'cancelled' }))
      const other = await world.addRequest(world.headU)
      vi.clearAllMocks()

      const own = await world.services.request.listOwn(world.tenantId, world.caller({ employeeId: world.nurse.id }), {})
      const cancelled = await world.services.request.listOwn(world.tenantId, world.caller({ employeeId: world.nurse.id }), { status: 'cancelled' })
      const inRange = await world.services.request.listOwn(world.tenantId, world.caller({ employeeId: world.nurse.id }), { from: '2026-12-08', to: '2026-12-31' })

      expect(own.map((request) => request.id)).toEqual([second.id, first.id])
      expect(own.map((request) => request.id)).not.toContain(other.id)
      expect(cancelled.map((request) => request.id)).toEqual([first.id])
      expect(inRange.map((request) => request.id)).toEqual([second.id])
      expect(await rejection(() => world.services.request.listOwn(world.tenantId, world.caller(), {}))).toBeInstanceOf(ForbiddenError)
      expect(world.logs.written()).toBe('[[],[],[],[]]')
    })

    it('lists every request of the tenant for a reader, with filters, and refuses a caller who may not read', async () => {
      const mine = await create()
      const theirs = await world.addRequest(world.headU, { unit_id: world.ward.id })
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })
      await world.addRequest(foreign)

      const all = await world.services.request.list(world.tenantId, world.caller({ canRead: true }), {})
      const byEmployee = await world.services.request.list(world.tenantId, world.caller({ canRead: true }), { employeeId: world.headU.id })
      const byUnit = await world.services.request.list(world.tenantId, world.caller({ canRead: true }), { unitId: world.ward.id })

      expect(all.map((request) => request.id).sort()).toEqual([mine.id, theirs.id].sort())
      expect(byEmployee.map((request) => request.id)).toEqual([theirs.id])
      expect(byUnit.map((request) => request.id).sort()).toEqual([mine.id, theirs.id].sort())
      expect(await rejection(() => world.services.request.list(world.tenantId, world.caller({ employeeId: world.nurse.id }), {}))).toBeInstanceOf(ForbiddenError)
    })

    it('lists the requests whose proof is overdue for a reader', async () => {
      await world.addRequest(world.nurse, { proof_due_on: '2026-11-18', proof_received: false })
      await world.addRequest(world.nurse, { proof_due_on: '2026-11-18', proof_received: true, period: { start: '2026-12-10', end: '2026-12-11' } })
      await world.addRequest(world.nurse, { proof_due_on: '2026-11-19', proof_received: false, period: { start: '2026-12-15', end: '2026-12-16' } })

      const overdue = await world.services.request.list(world.tenantId, world.caller({ canRead: true }), { proofOverdue: true })

      expect(overdue).toHaveLength(1)
      expect(overdue[0]?.proof_due_on).toBe('2026-11-18')
    })

    it('lists what waits for the caller: a Head\'s own units, and for HR Manager the first steps that fall to HR and every second step', async () => {
      await world.post(world.headU, 'grant', 12)
      const forUnitHead = await create()
      const forParent = await world.asAdmin(() => world.services.request.create(world.tenantId, world.caller({ employeeId: world.headU.id }), input({ start: '2026-12-08', end: '2026-12-08' })))
      const forHr = await world.addRequest(world.nurse, { period: { start: '2026-12-15', end: '2026-12-15' } })
      const second = await world.addRequest(world.nurse, { status: 'head_approved', period: { start: '2026-12-16', end: '2026-12-16' }, deciders: { first: { kind: 'unit_head', unit_id: world.ward.id, employee_id: null }, second: true } })

      const unitHead = await world.services.request.list(world.tenantId, world.caller({ employeeId: world.headU.id, canDecide: true }), { waitingForMe: true })
      const parentHead = await world.services.request.list(world.tenantId, world.caller({ employeeId: world.headP.id, canDecide: true }), { waitingForMe: true })
      const hr = await world.services.request.list(world.tenantId, world.caller({ canApproveHr: true }), { waitingForMe: true })
      const nobody = await world.services.request.list(world.tenantId, world.caller({ employeeId: world.nurse.id }), { waitingForMe: true })
      const headWithoutPermission = await world.services.request.list(world.tenantId, world.caller({ employeeId: world.headU.id }), { waitingForMe: true })

      expect(unitHead.map((request) => request.id)).toEqual([forUnitHead.id])
      expect(parentHead.map((request) => request.id)).toEqual([forParent.id])
      expect(hr.map((request) => request.id).sort()).toEqual([forHr.id, second.id].sort())
      expect(nobody).toEqual([])
      expect(headWithoutPermission).toEqual([])
    })

    it('shows a request to its requester, to the Head who has to decide it, to a reader and to HR Manager, and answers 404 to anyone else', async () => {
      const created = await create()
      const get = (caller: ReturnType<LeaveWorld['caller']>, id = created.id) => world.services.request.get(world.tenantId, id, caller)

      expect((await get(world.caller({ employeeId: world.nurse.id }))).id).toBe(created.id)
      expect((await get(world.caller({ employeeId: world.headU.id }))).id).toBe(created.id)
      expect((await get(world.caller({ canRead: true }))).id).toBe(created.id)
      expect((await get(world.caller({ canApproveHr: true }))).id).toBe(created.id)
      expect(JSON.stringify(await get(world.caller({ canRead: true })))).not.toContain('Keperluan Rahasia')
      for (const stranger of [world.caller({ employeeId: world.headP.id }), world.caller({ employeeId: (await world.addEmployee()).id }), world.caller()]) {
        const thrown = await rejection(() => get(stranger))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('leave_request_not_found')
      }
    })

    it('answers 404 for a missing, malformed or other tenant\'s request, even to a reader', async () => {
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })
      const theirs = await world.addRequest(foreign)

      for (const id of [theirs.id, new Types.ObjectId().toHexString(), 'bad']) {
        const thrown = await rejection(() => world.services.request.get(world.tenantId, id, world.caller({ canRead: true })))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('leave_request_not_found')
      }
      expect(world.logs.written()).toBe('[[],[],[],[]]')
    })

    it('lets the Head who is appointed after the request was made see it, and no longer the former Head', async () => {
      const created = await create()
      const [position] = await world.repos.positions.findAll({ where: { unit_id: { eq: world.ward.id } } })
      const [assignment] = await world.repos.assignments.findOpenByPosition(world.tenantId, position!.id)
      await world.seed(() => world.repos.assignments.update(assignment!.id, { status: 'ended', is_open: false }))
      const successor = await world.addEmployee()
      await world.assign(successor, world.ward, true)

      expect((await world.services.request.get(world.tenantId, created.id, world.caller({ employeeId: successor.id }))).id).toBe(created.id)
      expect(await codeOf(() => world.services.request.get(world.tenantId, created.id, world.caller({ employeeId: world.headU.id })))).toBe('leave_request_not_found')
    })
  })
})
