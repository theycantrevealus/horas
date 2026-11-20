import { runWithRequestContext } from '@utility/logger/context'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, InvalidRequestError, NotFoundError } from '../workforce.error'

describe('LeaveTypeChangeService', () => {
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
   * Makes the nurse's request through the service and gets it approved by the Head.
   *
   * @param type - The leave type.
   * @param start - First date.
   * @param end - Last date.
   * @returns The approved request.
   */
  async function approved(type = annual, start = '2026-12-01', end = '2026-12-03') {
    const created = await world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), { leaveType: type, start, end, reason: 'Keperluan' }),
    )
    const head = world.caller({ accountId: 'head', employeeId: world.headU.id, canDecide: true })
    return runWithRequestContext({ correlationId: 'c', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } }, () =>
      world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head),
    )
  }

  /**
   * Changes the type as HR.
   *
   * @param id - Request identifier.
   * @param leaveType - The new type.
   * @param extra - Other fields of the input.
   * @returns The updated request.
   */
  function change(id: string, leaveType = sick, extra: object = {}) {
    return world.asAdmin(() => world.services.typeChange.change(world.tenantId, id, { leaveType, reason: 'Sakit saat cuti', ...extra }))
  }

  /**
   * The ledger entries of a request as `[type, kind, days]`.
   *
   * @param id - Request identifier.
   */
  async function entries(id: string) {
    return (await world.repos.ledger.findByRequest(world.tenantId, id)).map((entry) => [entry.leave_type.code, entry.kind, entry.days])
  }

  /**
   * Days available to the nurse in annual leave.
   */
  async function available() {
    return (await world.services.balances.summary(world.tenantId, world.nurse.id, annual, '2026-03-15')).available
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

  it('changes annual leave to a type without a balance: reverses the annual uses, replaces the policy and the rules, keeps the days', async () => {
    const sickPolicy = await world.addPolicy('sakit', { kind: 'none' }, { approval: { steps: 'two_step', two_step_above_days: null } })
    const request = await approved()
    expect(await available()).toBe(9)
    vi.clearAllMocks()

    const changed = await change(request.id)

    expect(changed).toMatchObject({ leave_type: sick, policy_id: sickPolicy.id, entitlement_period: null, rules: { balance_kind: 'none', counting: 'working_days', steps: 'two_step' }, total_days: 3, status: 'approved' })
    expect(changed.days).toEqual(request.days)
    expect(await entries(request.id)).toEqual([['tahunan', 'use', -3], ['tahunan', 'reversal', 3]])
    expect(await available()).toBe(12)
    expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_type_change', outcome: 'success' })
    for (const text of ['sakit', 'tahunan', 'Sakit saat cuti', '2026-12-01']) {
      expect(world.logs.written()).not.toContain(text)
    }
  })

  it('changes a type without a balance to annual leave and uses the annual days', async () => {
    await world.addPolicy('sakit', { kind: 'none' })
    const request = await approved(sick)
    expect(await entries(request.id)).toEqual([])

    const changed = await change(request.id, annual)

    expect(changed).toMatchObject({ leave_type: annual, policy_id: world.annualPolicy.id, entitlement_period: { start: '2026-03-15', end: '2027-03-14' }, rules: { balance_kind: 'period' } })
    expect(await entries(request.id)).toEqual([['tahunan', 'use', -3]])
    expect(await available()).toBe(9)
  })

  it('writes nothing when the new type has too few days, and keeps the request as it was', async () => {
    await world.addPolicy('sakit', { kind: 'none' })
    const request = await approved(sick)
    await world.post(world.nurse, 'use', -10)

    const thrown = await rejection(() => change(request.id, annual))

    expect((thrown as InvalidRequestError).code).toBe('insufficient_balance')
    expect((await world.repos.requests.findOne(request.id))).toMatchObject({ leave_type: sick, version: request.version })
    expect(await entries(request.id)).toEqual([])
  })

  it('recounts the days when the new type counts calendar days, and keeps them otherwise', async () => {
    await world.addPolicy('menikah', { kind: 'per_event', days: 3 }, { counting: 'calendar_days', max_days_per_request: 3 })
    const request = await approved(annual, '2026-12-04', '2026-12-06')
    expect(request.days.map((day) => day.count)).toEqual([1, 0, 0])

    const changed = await change(request.id, { system: 'id.leave-type', code: 'menikah' })

    expect(changed.days).toEqual([
      { date: '2026-12-04', count: 1, why: 'calendar_day', set_by: 'policy' },
      { date: '2026-12-05', count: 1, why: 'calendar_day', set_by: 'policy' },
      { date: '2026-12-06', count: 1, why: 'calendar_day', set_by: 'policy' },
    ])
    expect(changed.total_days).toBe(3)
    expect(changed.rules.counting).toBe('calendar_days')
    expect(await entries(request.id)).toEqual([['tahunan', 'use', -1], ['tahunan', 'reversal', 1]])
  })

  it('refuses a recount over the limit of the new type', async () => {
    await world.addPolicy('menikah', { kind: 'per_event', days: 2 }, { counting: 'calendar_days', max_days_per_request: 2 })
    const request = await approved(annual, '2026-12-04', '2026-12-06')

    const thrown = await rejection(() => change(request.id, { system: 'id.leave-type', code: 'menikah' }))

    expect((thrown as InvalidRequestError).code).toBe('too_many_days')
    expect(await entries(request.id)).toEqual([['tahunan', 'use', -1]])
  })

  it('works on an approved request only, and needs a reason, another active type with a policy open to the employee', async () => {
    await world.addPolicy('sakit', { kind: 'none' }, { employment_types: [{ system: 'id.employment-type', code: 'pkwt' }] })
    const waiting = await world.addRequest(world.nurse, { policy_id: world.annualPolicy.id, period: { start: '2027-01-10', end: '2027-01-11' } })
    const request = await approved()
    const code = async (id: string, input: object) => ((await rejection(() => world.asAdmin(() => world.services.typeChange.change(world.tenantId, id, input as never)))) as InvalidRequestError).code

    expect(await code(waiting.id, { leaveType: sick, reason: 'x' })).toBe('invalid_transition')
    expect(await code(request.id, { leaveType: sick })).toBe('reason_required')
    expect(await code(request.id, { leaveType: sick, reason: ' ' })).toBe('reason_required')
    expect(await code(request.id, { leaveType: sick, reason: 'x'.repeat(501) })).toBe('invalid_reason')
    expect(await code(request.id, { leaveType: { system: 'id.profession', code: 'x' }, reason: 'x' })).toBe('invalid_leave_type')
    expect(await code(request.id, { leaveType: annual, reason: 'x' })).toBe('same_type')
    expect(await code(request.id, { leaveType: { system: 'id.leave-type', code: 'nope' }, reason: 'x' })).toBe('unknown_code')
    expect(await code(request.id, { leaveType: { system: 'id.leave-type', code: 'menikah' }, reason: 'x' })).toBe('no_policy')
    expect(await code(request.id, { leaveType: sick, reason: 'x' })).toBe('employment_type_not_allowed')
  })

  it('answers 404 for a missing, malformed or foreign request and 409 for an old version', async () => {
    await world.addPolicy('sakit', { kind: 'none' })
    const request = await approved()

    const missing = await rejection(() => change('bad'))
    const foreign = await rejection(() => world.asAdmin(() => world.services.typeChange.change(world.otherTenantId, request.id, { leaveType: sick, reason: 'x' })))
    const stale = await rejection(() => change(request.id, sick, { version: 99 }))

    expect(missing).toBeInstanceOf(NotFoundError)
    expect((foreign as NotFoundError).code).toBe('leave_request_not_found')
    expect(stale).toBeInstanceOf(ConflictError)
    expect((stale as ConflictError).code).toBe('stale_version')
  })
})
