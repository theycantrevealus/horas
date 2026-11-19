import { Types } from 'mongoose'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, InvalidRequestError, NotFoundError } from '../workforce.error'

describe('LeaveDetailService', () => {
  let world: LeaveWorld
  const proof = { file_id: 'f1', content_type: 'application/pdf', sha256: 'a'.repeat(64) }

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
   * Creates the nurse's request through the service, so it has its detail.
   *
   * @returns The request.
   */
  function create() {
    return world.asAdmin(() =>
      world.services.request.create(world.tenantId, world.caller({ employeeId: world.nurse.id }), {
        leaveType: { system: 'id.leave-type', code: 'tahunan' }, start: '2026-12-01', end: '2026-12-03', reason: 'Keperluan Rahasia',
      }),
    )
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

  describe('read', () => {
    it('shows the reason and proof to the requester, the Head who decides and a holder of the permission, and records one access entry each time', async () => {
      const created = await create()
      vi.clearAllMocks()
      const detail = await world.repos.details.findByRequest(world.tenantId, created.id)
      const read = (caller: ReturnType<LeaveWorld['caller']>) => world.services.detail.read(world.tenantId, created.id, caller)

      for (const caller of [world.caller({ employeeId: world.nurse.id }), world.caller({ employeeId: world.headU.id }), world.caller({ canReadDetails: true }), world.caller({ canApproveHr: true })]) {
        expect(await read(caller)).toEqual({ reason: 'Keperluan Rahasia', proof: null })
      }
      expect(world.recordAccess).toHaveBeenCalledTimes(4)
      expect(world.recordAccess).toHaveBeenCalledWith({ type: 'leave_request_detail', id: detail?.id, operation: 'LeaveDetailService.read', tenantId: world.tenantId })
      expect(world.logs.written()).toBe('[[],[],[],[]]')
    })

    it('answers 404 to anyone else, even a reader of requests, and records nothing', async () => {
      const created = await create()

      for (const stranger of [world.caller({ employeeId: world.headP.id }), world.caller({ canRead: true }), world.caller({ canWrite: true }), world.caller()]) {
        const thrown = await rejection(() => world.services.detail.read(world.tenantId, created.id, stranger))
        expect(thrown).toBeInstanceOf(NotFoundError)
        expect((thrown as NotFoundError).code).toBe('leave_request_not_found')
      }
      expect(world.recordAccess).not.toHaveBeenCalled()
    })

    it('returns nothing when the access cannot be recorded', async () => {
      const created = await create()
      world.recordAccess.mockRejectedValueOnce(new Error('outbox down'))

      const thrown = await rejection(() => world.services.detail.read(world.tenantId, created.id, world.caller({ employeeId: world.nurse.id })))

      expect(thrown).toBeInstanceOf(Error)
      expect((thrown as Error).message).toBe('outbox down')
    })

    it('answers 404 for a missing, malformed or other tenant\'s request', async () => {
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })
      const theirs = await world.addRequest(foreign)

      for (const id of [theirs.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => world.services.detail.read(world.tenantId, id, world.caller({ canReadDetails: true })))).toBeInstanceOf(NotFoundError)
      }
    })
  })

  describe('attachProof', () => {
    it('stores the proof and marks it received, for the requester and for HR, and logs no values', async () => {
      const created = await create()
      vi.clearAllMocks()

      const updated = await world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, proof, world.caller({ employeeId: world.nurse.id })))
      expect(updated).toMatchObject({ id: created.id, proof_received: true })
      expect((await world.repos.details.findByRequest(world.tenantId, created.id))?.proof).toMatchObject({ file_id: 'f1' })
      const byHr = await world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, { ...proof, file_id: 'f2' }, world.caller({ canWrite: true })))
      expect(byHr.proof_received).toBe(true)
      expect((await world.repos.details.findByRequest(world.tenantId, created.id))?.proof).toMatchObject({ file_id: 'f2' })
      expect(world.logs.log).toHaveBeenCalledTimes(2)
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'leave_proof_attach', outcome: 'success' })
      for (const text of ['f1', 'f2', 'Keperluan Rahasia']) {
        expect(world.logs.written()).not.toContain(text)
      }
    })

    it('works on a waiting or approved request and refuses a rejected or cancelled one', async () => {
      const created = await create()
      for (const status of ['head_approved', 'approved'] as const) {
        await world.seed(() => world.repos.requests.update(created.id, { status }))
        expect((await world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, proof, world.caller({ employeeId: world.nurse.id })))).proof_received).toBe(true)
      }
      for (const status of ['rejected', 'cancelled'] as const) {
        await world.seed(() => world.repos.requests.update(created.id, { status }))
        const thrown = await rejection(() => world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, proof, world.caller({ employeeId: world.nurse.id }))))
        expect(thrown).toBeInstanceOf(InvalidRequestError)
        expect((thrown as InvalidRequestError).code).toBe('proof_not_allowed')
      }
    })

    it('answers 404 to a caller who is not the requester and has no permission, and refuses a bad file reference', async () => {
      const created = await create()

      const stranger = await rejection(() => world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, proof, world.caller({ employeeId: world.headU.id }))))
      expect(stranger).toBeInstanceOf(NotFoundError)
      for (const bad of [{ ...proof, sha256: 'xyz' }, { ...proof, file_id: '' }, { ...proof, content_type: 'text/html' }]) {
        const thrown = await rejection(() => world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, bad, world.caller({ employeeId: world.nurse.id }))))
        expect(thrown).toBeInstanceOf(InvalidRequestError)
        expect((thrown as InvalidRequestError).code).toBe('invalid_proof')
      }
    })

    it('refuses a stale version', async () => {
      const created = await create()

      const thrown = await rejection(() => world.asAdmin(() => world.services.detail.attachProof(world.tenantId, created.id, proof, world.caller({ employeeId: world.nurse.id }), created.version + 3)))

      expect(thrown).toBeInstanceOf(ConflictError)
      expect((thrown as ConflictError).code).toBe('stale_version')
    })
  })
})
