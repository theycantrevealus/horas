import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, ForbiddenError, InvalidRequestError, NotFoundError } from '../workforce.error'

describe('LeaveDecisionService', () => {
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
   * Runs `work` as the account of a caller, so a decision records who made it.
   *
   * @param who - The caller.
   * @param work - The call.
   * @returns What `work` returns.
   */
  function as<T>(who: ReturnType<LeaveWorld['caller']>, work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c', actor: { account_id: who.accountId, display_name: 'X', kind: 'account' } }, work)
  }

  /**
   * The Head of the nurse's ward, as a caller.
   */
  function head() {
    return world.caller({ accountId: 'head', employeeId: world.headU.id, canDecide: true })
  }

  /**
   * An HR Manager, as a caller.
   */
  function hr(accountId = 'hr') {
    return world.caller({ accountId, employeeId: world.headP.id, canApproveHr: true, canWrite: true })
  }

  /**
   * The nurse's request for three days in December, made through the service.
   *
   * @param start - First date.
   * @param end - Last date.
   * @returns The request.
   */
  function create(start = '2026-12-01', end = '2026-12-03') {
    return world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), { leaveType: annual, start, end, reason: 'Keperluan Rahasia' }),
    )
  }

  /**
   * Adds a colleague who can replace the nurse.
   */
  function colleague() {
    return world.addEmployee()
  }

  /**
   * The ledger entries of a request.
   *
   * @param id - Request identifier.
   */
  function entriesOf(id: string) {
    return world.repos.ledger.findByRequest(world.tenantId, id)
  }

  /**
   * Days available to the nurse in annual leave.
   */
  async function available() {
    return (await world.services.balances.summary(world.tenantId, world.nurse.id, annual, '2026-03-15')).available
  }

  /**
   * A request that needs two steps, first decided by the nurse's Head.
   */
  function twoStep() {
    return world.addRequest(world.nurse, {
      policy_id: world.annualPolicy.id,
      deciders: { first: { kind: 'unit_head', unit_id: world.ward.id, employee_id: null }, second: true },
    })
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

  describe('approve', () => {
    it('approves a one-step request: stores the replacement, posts the uses, calls the effects once and logs no values', async () => {
      const created = await create()
      const replacement = await colleague()
      vi.clearAllMocks()

      const approved = await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { replacementEmployeeId: replacement.id }, head()))

      expect(approved).toMatchObject({ status: 'approved', replacement: { employee_id: replacement.id, none_reason: null } })
      expect(approved.decisions).toMatchObject([{ step: 'first', outcome: 'approved', by: { account_id: 'head' }, reason: null }])
      expect(await entriesOf(created.id)).toMatchObject([{ kind: 'use', days: -3, bucket: 'own', period: { start: '2026-03-15', end: '2027-03-14' }, source: { kind: 'request', ref_id: created.id } }])
      expect(await available()).toBe(9)
      expect(world.effects.onApproved).toHaveBeenCalledTimes(1)
      expect(world.effects.onApproved).toHaveBeenCalledWith(expect.objectContaining({ id: created.id, status: 'approved' }))
      expect(world.logs.log).toHaveBeenCalledTimes(1)
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_request_approve', outcome: 'success' })
      for (const text of [replacement.id, 'Keperluan', '2026-12-01', world.nurse.id]) {
        expect(world.logs.written()).not.toContain(text)
      }
    })

    it('says why there is no replacement, and uses carried-over days before the days of the period', async () => {
      await world.post(world.nurse, 'carry_over', 2, { bucket: 'carry_over', expires_on: '2027-06-30' })
      const created = await create()

      await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'Unit kecil' }, head()))

      expect(await entriesOf(created.id)).toMatchObject([{ days: -2, bucket: 'carry_over' }, { days: -1, bucket: 'own' }])
      expect((await world.repos.requests.findOne(created.id))?.replacement).toEqual({ employee_id: null, none_reason: 'Unit kecil' })
    })

    it('goes through head_approved for two steps, and posts the uses and calls the effects only at the end', async () => {
      const request = await twoStep()
      const replacement = await colleague()

      const first = await as(head(), () => world.services.decision.approve(world.tenantId, request.id, { replacementEmployeeId: replacement.id }, head()))
      expect(first.status).toBe('head_approved')
      expect(await entriesOf(request.id)).toEqual([])
      expect(world.effects.onApproved).not.toHaveBeenCalled()

      const second = await as(hr(), () => world.services.decision.approve(world.tenantId, request.id, {}, hr()))

      expect(second.status).toBe('approved')
      expect(second.decisions.map((decision) => decision.step)).toEqual(['first', 'second'])
      expect(second.replacement?.employee_id).toBe(replacement.id)
      expect(await entriesOf(request.id)).toHaveLength(1)
      expect(world.effects.onApproved).toHaveBeenCalledTimes(1)
    })

    it('refuses the second step to whoever gave the first, to a caller without the HR permission, and a replacement at the second step', async () => {
      const request = await twoStep()
      const replacement = await colleague()
      await as(hr('same'), () => world.services.decision.approve(world.tenantId, request.id, { replacementEmployeeId: replacement.id }, world.caller({ accountId: 'same', employeeId: world.headU.id, canDecide: true })))

      const same = await rejection(() => as(hr('same'), () => world.services.decision.approve(world.tenantId, request.id, {}, hr('same'))))
      const without = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, request.id, {}, head())))
      const extra = await rejection(() => as(hr(), () => world.services.decision.approve(world.tenantId, request.id, { noReplacementReason: 'x' }, hr())))

      expect(same).toBeInstanceOf(ForbiddenError)
      expect((same as ForbiddenError).code).toBe('same_decider')
      expect((without as ForbiddenError).code).toBe('not_the_decider')
      expect((extra as InvalidRequestError).code).toBe('replacement_not_allowed')
    })

    it('lets only the current Head decide: not the former Head, not the parent Head, not a caller without the permission, and HR Manager only when HR decides', async () => {
      const created = await create()
      const input = { noReplacementReason: 'Tidak ada' }
      const attempts: [string, ReturnType<LeaveWorld['caller']>][] = [
        ['parent head', world.caller({ accountId: 'p', employeeId: world.headP.id, canDecide: true })],
        ['no permission', world.caller({ accountId: 'n', employeeId: world.headU.id })],
        ['hr when a head decides', hr()],
      ]
      for (const [, who] of attempts) {
        const thrown = await rejection(() => as(who, () => world.services.decision.approve(world.tenantId, created.id, input, who)))
        expect(thrown).toBeInstanceOf(ForbiddenError)
        expect((thrown as ForbiddenError).code).toBe('not_the_decider')
      }
      const newHead = await world.addEmployee()
      const headAssignment = (await world.repos.assignments.findOpenByEmployee(world.tenantId, world.headU.id))[0]!
      await world.seed(() => world.repos.assignments.update(headAssignment.id, { status: 'ended', is_open: false } as never))
      await world.assign(newHead, world.ward, true)
      const former = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, input, head())))
      expect((former as ForbiddenError).code).toBe('not_the_decider')
      const current = world.caller({ accountId: 'new', employeeId: newHead.id, canDecide: true })
      expect((await as(current, () => world.services.decision.approve(world.tenantId, created.id, input, current))).status).toBe('approved')
    })

    it('lets HR Manager decide the first step when the decider is HR Manager', async () => {
      const request = await world.addRequest(world.nurse, { policy_id: world.annualPolicy.id })

      const approved = await as(hr(), () => world.services.decision.approve(world.tenantId, request.id, { noReplacementReason: 'Tidak ada' }, hr()))

      expect(approved.status).toBe('approved')
    })

    it('refuses to decide one\'s own leave, an account with no employee, another tenant and a request past the steps', async () => {
      const own = await world.addRequest(world.headU, { policy_id: world.annualPolicy.id, deciders: { first: { kind: 'parent_head', unit_id: world.parent.id, employee_id: null }, second: false } })
      const created = await create()
      const self = world.caller({ accountId: 'self', employeeId: world.headU.id, canDecide: true, canApproveHr: true })

      const mine = await rejection(() => as(self, () => world.services.decision.approve(world.tenantId, own.id, { noReplacementReason: 'x' }, self)))
      const unlinked = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, {}, world.caller({ accountId: 'u', canDecide: true }))))
      const foreign = await rejection(() => as(head(), () => world.services.decision.approve(new Types.ObjectId().toHexString(), created.id, {}, head())))
      const missing = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, 'bad', {}, head())))
      await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head()))
      const again = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head())))

      expect((mine as ForbiddenError).code).toBe('decider_is_requester')
      expect((unlinked as ForbiddenError).code).toBe('employee_required')
      expect(foreign).toBeInstanceOf(NotFoundError)
      expect((foreign as NotFoundError).code).toBe('leave_request_not_found')
      expect((missing as NotFoundError).code).toBe('leave_request_not_found')
      expect((again as InvalidRequestError).code).toBe('invalid_transition')
    })

    it('needs a replacement or a reason, not both, and a replacement who is another active employee of the tenant', async () => {
      const created = await create()
      const code = async (input: object) => ((await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, input, head())))) as InvalidRequestError).code
      const suspended = await world.addEmployee({ status: 'suspended' })
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })

      expect(await code({})).toBe('replacement_required')
      expect(await code({ replacementEmployeeId: world.nurse.id, noReplacementReason: 'x' })).toBe('replacement_required')
      expect(await code({ replacementEmployeeId: world.nurse.id })).toBe('invalid_replacement')
      expect(await code({ replacementEmployeeId: suspended.id })).toBe('invalid_replacement')
      expect(await code({ replacementEmployeeId: foreign.id })).toBe('invalid_replacement')
      expect(await code({ replacementEmployeeId: new Types.ObjectId().toHexString() })).toBe('invalid_replacement')
      expect(await code({ noReplacementReason: '  ' })).toBe('reason_required')
      expect(await code({ noReplacementReason: 'x'.repeat(501) })).toBe('invalid_reason')
      expect((await world.repos.requests.findOne(created.id))?.status).toBe('requested')
    })

    it('checks the balance again without the request\'s own reservation, and posts nothing when it is not enough', async () => {
      const created = await create()
      expect(await available()).toBe(9)
      await world.post(world.nurse, 'use', -9.5)

      const thrown = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head())))

      expect((thrown as InvalidRequestError).code).toBe('insufficient_balance')
      expect(await entriesOf(created.id)).toEqual([])
      expect(world.effects.onApproved).not.toHaveBeenCalled()
      await world.post(world.nurse, 'adjustment', 1)
      expect((await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head()))).status).toBe('approved')
    })

    it('answers 409 stale_version to an old version, and when two approvals race only one posts the uses', async () => {
      const created = await create()
      const input = { noReplacementReason: 'x' }

      const old = await rejection(() => as(head(), () => world.services.decision.approve(world.tenantId, created.id, { ...input, version: created.version + 5 }, head())))
      const results = await Promise.allSettled([
        as(head(), () => world.services.decision.approve(world.tenantId, created.id, input, head())),
        as(head(), () => world.services.decision.approve(world.tenantId, created.id, input, head())),
      ])

      expect(old).toBeInstanceOf(ConflictError)
      expect((old as ConflictError).code).toBe('stale_version')
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      const failed = results.find((result) => result.status === 'rejected') as PromiseRejectedResult
      expect(failed.reason).toBeInstanceOf(ConflictError)
      expect(await entriesOf(created.id)).toHaveLength(1)
      expect(world.effects.onApproved).toHaveBeenCalledTimes(1)
    })
  })

  describe('reject', () => {
    it('rejects at the first step with a reason, frees the reserved days and logs no reason', async () => {
      const created = await create()
      expect(await available()).toBe(9)
      vi.clearAllMocks()

      const rejected = await as(head(), () => world.services.decision.reject(world.tenantId, created.id, { reason: 'Unit kekurangan perawat' }, head()))

      expect(rejected.status).toBe('rejected')
      expect(rejected.decisions).toMatchObject([{ step: 'first', outcome: 'rejected', reason: 'Unit kekurangan perawat' }])
      expect(await available()).toBe(12)
      expect(await entriesOf(created.id)).toEqual([])
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_request_reject', outcome: 'success' })
      expect(world.logs.written()).not.toContain('kekurangan')
    })

    it('rejects at the second step, by HR only and never by the first decider', async () => {
      const request = await twoStep()
      await as(head(), () => world.services.decision.approve(world.tenantId, request.id, { noReplacementReason: 'x' }, head()))

      const same = await rejection(() => as(head(), () => world.services.decision.reject(world.tenantId, request.id, { reason: 'x' }, head())))
      const rejected = await as(hr(), () => world.services.decision.reject(world.tenantId, request.id, { reason: 'Kuota habis' }, hr()))

      expect((same as ForbiddenError).code).toBe('not_the_decider')
      expect(rejected.status).toBe('rejected')
      expect(rejected.decisions.map((decision) => [decision.step, decision.outcome])).toEqual([['first', 'approved'], ['second', 'rejected']])
    })

    it('needs a reason, the right decider and a request that waits for a decision', async () => {
      const created = await create()
      const code = async (input: object, who = head()) => ((await rejection(() => as(who, () => world.services.decision.reject(world.tenantId, created.id, input as never, who)))) as { code: string }).code

      expect(await code({})).toBe('reason_required')
      expect(await code({ reason: ' ' })).toBe('reason_required')
      expect(await code({ reason: 'x'.repeat(501) })).toBe('invalid_reason')
      expect(await code({ reason: 'x' }, hr())).toBe('not_the_decider')
      await as(head(), () => world.services.decision.reject(world.tenantId, created.id, { reason: 'x' }, head()))
      expect(await code({ reason: 'x' })).toBe('invalid_transition')
    })
  })

  describe('adjustDays', () => {
    it('lets the first decider change the counted days, marks them as set by the Head and recounts the total', async () => {
      const created = await create('2026-12-04', '2026-12-07')
      expect(created.days.map((day) => day.count)).toEqual([1, 0, 0, 1])
      vi.clearAllMocks()

      const adjusted = await as(head(), () => world.services.decision.adjustDays(world.tenantId, created.id, { days: [{ date: '2026-12-05', count: 1 }, { date: '2026-12-07', count: 0 }] }, head()))

      expect(adjusted.total_days).toBe(2)
      expect(adjusted.days).toEqual([
        { date: '2026-12-04', count: 1, why: 'working', set_by: created.days[0]!.set_by },
        { date: '2026-12-05', count: 1, why: 'working', set_by: 'head' },
        { date: '2026-12-06', count: 0, why: created.days[2]!.why, set_by: created.days[2]!.set_by },
        { date: '2026-12-07', count: 0, why: 'rest_day', set_by: 'head' },
      ])
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_days_adjust', outcome: 'success' })
      expect(world.logs.written()).not.toContain('2026-12')
    })

    it('allows 0.5 only on a half first or last day, and refuses other counts, dates outside the request, repeats and an empty list', async () => {
      const request = await world.addRequest(world.nurse, {
        policy_id: world.annualPolicy.id,
        half_days: { first: true, last: false },
        days: ['2026-12-01', '2026-12-02', '2026-12-03'].map((date) => ({ date, count: 1 as const, why: 'working' as const, set_by: 'working_week' as const })),
        deciders: { first: { kind: 'unit_head', unit_id: world.ward.id, employee_id: null }, second: false },
      })
      const code = async (days: { date: string; count: number }[]) => ((await rejection(() => as(head(), () => world.services.decision.adjustDays(world.tenantId, request.id, { days }, head())))) as InvalidRequestError).code

      expect(await code([{ date: '2026-12-02', count: 0.5 }])).toBe('invalid_count')
      expect(await code([{ date: '2026-12-02', count: 2 }])).toBe('invalid_count')
      expect(await code([{ date: '2026-12-09', count: 1 }])).toBe('date_outside_period')
      expect(await code([{ date: '2026-12-02', count: 1 }, { date: '2026-12-02', count: 0 }])).toBe('duplicate_date')
      expect(await code([])).toBe('invalid_days')
      expect(await code([{ date: '2026-12-01', count: 0 }, { date: '2026-12-02', count: 0 }, { date: '2026-12-03', count: 0 }])).toBe('invalid_days')
      const adjusted = await as(head(), () => world.services.decision.adjustDays(world.tenantId, request.id, { days: [{ date: '2026-12-01', count: 0.5 }] }, head()))
      expect(adjusted.total_days).toBe(2.5)
    })

    it('checks the balance and the limit of the policy again, and leaves the request unchanged when they fail', async () => {
      const created = await create('2026-12-04', '2026-12-07')
      await world.post(world.nurse, 'use', -10)

      const thrown = await rejection(() => as(head(), () => world.services.decision.adjustDays(world.tenantId, created.id, { days: [{ date: '2026-12-05', count: 1 }] }, head())))

      expect((thrown as InvalidRequestError).code).toBe('insufficient_balance')
      expect((await world.repos.requests.findOne(created.id))?.total_days).toBe(2)
    })

    it('is for the first-step decider on a request that waits for the first step, and checks the version', async () => {
      const created = await create()
      const body = { days: [{ date: '2026-12-02', count: 0 }] }

      const notHead = await rejection(() => as(hr(), () => world.services.decision.adjustDays(world.tenantId, created.id, body, hr())))
      const stale = await rejection(() => as(head(), () => world.services.decision.adjustDays(world.tenantId, created.id, { ...body, version: 99 }, head())))
      await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head()))
      const late = await rejection(() => as(head(), () => world.services.decision.adjustDays(world.tenantId, created.id, body, head())))

      expect((notHead as ForbiddenError).code).toBe('not_the_decider')
      expect((stale as ConflictError).code).toBe('stale_version')
      expect((late as InvalidRequestError).code).toBe('invalid_transition')
    })
  })

  describe('cancel', () => {
    it('lets the requester cancel a request that waits, and frees the reserved days without posting anything', async () => {
      const created = await create()
      vi.clearAllMocks()

      const cancelled = await world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, {}, world.caller({ employeeId: world.nurse.id })))

      expect(cancelled.status).toBe('cancelled')
      expect(await entriesOf(created.id)).toEqual([])
      expect(await available()).toBe(12)
      expect(world.effects.onCancelled).not.toHaveBeenCalled()
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_request_cancel', outcome: 'success' })
    })

    it('lets a holder of the write permission cancel, and hides the request from anyone else', async () => {
      const created = await create()

      const other = await rejection(() => world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, {}, world.caller({ employeeId: world.headU.id }))))
      const byHr = await world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, {}, world.caller({ canWrite: true })))

      expect((other as NotFoundError).code).toBe('leave_request_not_found')
      expect(byHr.status).toBe('cancelled')
    })

    it('cancels an approved leave that has not started: needs a reason, reverses the uses, calls the effects once', async () => {
      await world.post(world.nurse, 'carry_over', 2, { bucket: 'carry_over', expires_on: '2027-06-30' })
      const created = await create()
      await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head()))
      const requester = world.caller({ employeeId: world.nurse.id })
      expect(await available()).toBe(11)

      const noReason = await rejection(() => world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, {}, requester)))
      const cancelled = await world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, { reason: 'Rencana berubah' }, requester))

      expect((noReason as InvalidRequestError).code).toBe('reason_required')
      expect(cancelled.status).toBe('cancelled')
      expect((await entriesOf(created.id)).map((entry) => [entry.kind, entry.days, entry.bucket])).toEqual([['use', -2, 'carry_over'], ['use', -1, 'own'], ['reversal', 2, 'carry_over'], ['reversal', 1, 'own']])
      expect(await available()).toBe(14)
      expect(world.effects.onCancelled).toHaveBeenCalledTimes(1)
      expect(world.logs.written()).not.toContain('Rencana')
    })

    it('refuses a leave that has started, and a request that is already rejected or cancelled', async () => {
      const request = await create('2026-11-19', '2026-11-20')
      await as(head(), () => world.services.decision.approve(world.tenantId, request.id, { noReplacementReason: 'x' }, head()))
      vi.setSystemTime(new Date('2026-11-19T20:00:00Z'))
      const requester = world.caller({ employeeId: world.nurse.id })

      const late = await rejection(() => world.asAdmin(() => world.services.decision.cancel(world.tenantId, request.id, { reason: 'x' }, requester)))
      const done = await world.addRequest(world.nurse, { status: 'rejected', period: { start: '2027-01-10', end: '2027-01-11' } })
      const final = await rejection(() => world.asAdmin(() => world.services.decision.cancel(world.tenantId, done.id, {}, requester)))

      expect((late as InvalidRequestError).code).toBe('leave_started')
      expect((final as InvalidRequestError).code).toBe('invalid_transition')
    })

    it('answers 409 to an old version and posts no second reversal', async () => {
      const created = await create()
      await as(head(), () => world.services.decision.approve(world.tenantId, created.id, { noReplacementReason: 'x' }, head()))
      const requester = world.caller({ employeeId: world.nurse.id })

      const stale = await rejection(() => world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, { reason: 'x', version: 99 }, requester)))
      const results = await Promise.allSettled([
        world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, { reason: 'x' }, requester)),
        world.asAdmin(() => world.services.decision.cancel(world.tenantId, created.id, { reason: 'x' }, requester)),
      ])

      expect((stale as ConflictError).code).toBe('stale_version')
      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect((await entriesOf(created.id)).filter((entry) => entry.kind === 'reversal')).toHaveLength(1)
      expect(world.effects.onCancelled).toHaveBeenCalledTimes(1)
    })
  })
})
