import { runWithRequestContext } from '@utility/logger/context'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, InvalidRequestError, NotFoundError } from '../workforce.error'

describe('LeaveEndEarlyService', () => {
  let world: LeaveWorld
  const annual = { system: 'id.leave-type', code: 'tahunan' }

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
   * An approved annual leave of the nurse of ten working days that started today, 2026-11-19.
   *
   * @param start - First date.
   * @param end - Last date.
   * @returns The approved request.
   */
  async function approved(start = '2026-11-19', end = '2026-12-02') {
    const created = await world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), { leaveType: annual, start, end, reason: 'Keperluan' }),
    )
    const head = world.caller({ accountId: 'head', employeeId: world.headU.id, canDecide: true })
    return runWithRequestContext({ correlationId: 'c', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } }, () =>
      world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head),
    )
  }

  /**
   * Ends the leave early as HR.
   *
   * @param id - Request identifier.
   * @param lastDate - The new last date.
   * @param extra - Other fields of the input.
   * @returns The updated request.
   */
  function end(id: string, lastDate: string, extra: object = {}) {
    return world.asAdmin(() => world.services.endEarly.endEarly(world.tenantId, id, { lastDate, reason: 'Dipanggil kembali', ...extra }))
  }

  /**
   * What the ledger still holds for a request, by bucket.
   *
   * @param id - Request identifier.
   */
  async function entries(id: string) {
    return (await world.repos.ledger.findByRequest(world.tenantId, id)).map((entry) => [entry.kind, entry.days, entry.bucket])
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

  it('cuts the period and the days, recounts the total, gives the removed days back own first, and calls the effects once', async () => {
    await world.post(world.nurse, 'carry_over', 2, { bucket: 'carry_over', expires_on: '2027-06-30' })
    const request = await approved()
    expect(request.total_days).toBe(10)
    expect(await entries(request.id)).toEqual([['use', -2, 'carry_over'], ['use', -8, 'own']])
    vi.clearAllMocks()

    const ended = await end(request.id, '2026-11-24')

    expect(ended).toMatchObject({ status: 'approved', total_days: 4, period: { start: '2026-11-19', end: '2026-11-24' }, half_days: { first: false, last: false } })
    expect(ended.days.map((day) => day.date)).toEqual(['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'])
    expect(await entries(request.id)).toEqual([['use', -2, 'carry_over'], ['use', -8, 'own'], ['reversal', 6, 'own']])
    expect(await available()).toBe(10)
    expect(world.effects.onShortened).toHaveBeenCalledTimes(1)
    expect(world.effects.onShortened).toHaveBeenCalledWith(expect.objectContaining({ id: request.id }), '2026-11-24')
    expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_end_early', outcome: 'success' })
    for (const text of ['2026-11-24', 'Dipanggil', world.nurse.id]) {
      expect(world.logs.written()).not.toContain(text)
    }
  })

  it('gives carried-over days back after the own days when more days are removed than were taken from the period', async () => {
    await world.post(world.nurse, 'carry_over', 2, { bucket: 'carry_over', expires_on: '2027-06-30' })
    const request = await approved()

    await end(request.id, '2026-11-19')

    expect((await entries(request.id)).slice(2)).toEqual([['reversal', 8, 'own'], ['reversal', 1, 'carry_over']])
    expect(await available()).toBe(13)
  })

  it('refuses a leave that has not started, a last date outside the leave, a request that is not approved, and a missing reason', async () => {
    const future = await approved('2026-12-01', '2026-12-03')
    const started = await approved('2026-11-19', '2026-11-20')
    const code = async (id: string, input: object) => ((await rejection(() => world.asAdmin(() => world.services.endEarly.endEarly(world.tenantId, id, input as never)))) as InvalidRequestError).code

    expect(await code(future.id, { lastDate: '2026-12-01', reason: 'x' })).toBe('leave_not_started')
    expect(await code(started.id, { lastDate: '2026-11-20', reason: 'x' })).toBe('invalid_last_date')
    expect(await code(started.id, { lastDate: '2026-11-18', reason: 'x' })).toBe('invalid_last_date')
    expect(await code(started.id, { lastDate: 'soon', reason: 'x' })).toBe('invalid_last_date')
    expect(await code(started.id, { lastDate: '2026-11-19' })).toBe('reason_required')
    expect(await code(started.id, { lastDate: '2026-11-19', reason: 'x'.repeat(501) })).toBe('invalid_reason')
    const waiting = await world.addRequest(world.nurse, { period: { start: '2026-11-01', end: '2026-11-02' } })
    expect(await code(waiting.id, { lastDate: '2026-11-01', reason: 'x' })).toBe('invalid_transition')
    expect(world.effects.onShortened).not.toHaveBeenCalled()
    expect(await entries(started.id)).toEqual([['use', -2, 'own']])
  })

  it('answers 404 for a missing, malformed or foreign request and 409 for an old version', async () => {
    const request = await approved()

    const missing = await rejection(() => end('bad', '2026-11-20'))
    const foreign = await rejection(() => world.asAdmin(() => world.services.endEarly.endEarly(world.otherTenantId, request.id, { lastDate: '2026-11-20', reason: 'x' })))
    const stale = await rejection(() => end(request.id, '2026-11-20', { version: 99 }))

    expect(missing).toBeInstanceOf(NotFoundError)
    expect((foreign as NotFoundError).code).toBe('leave_request_not_found')
    expect((stale as ConflictError).code).toBe('stale_version')
    expect((await world.repos.requests.findOne(request.id))?.total_days).toBe(10)
  })

  it('removes a half last day with the days it cut, and a type without a balance posts nothing', async () => {
    await world.addPolicy('sakit', { kind: 'none' })
    const sick = await world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), { leaveType: { system: 'id.leave-type', code: 'sakit' }, start: '2026-11-19', end: '2026-11-23', halfDays: { first: false, last: true }, reason: 'Demam' }),
    )
    const head = world.caller({ accountId: 'head', employeeId: world.headU.id, canDecide: true })
    await runWithRequestContext({ correlationId: 'c', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } }, () => world.services.decision.approve(world.tenantId, sick.id, { noReplacementReason: 'x' }, head))

    const ended = await end(sick.id, '2026-11-20')

    expect(ended).toMatchObject({ half_days: { first: false, last: false }, period: { end: '2026-11-20' } })
    expect(await entries(sick.id)).toEqual([])
  })
})
