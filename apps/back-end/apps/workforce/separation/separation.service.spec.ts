import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { CodeConceptService } from '../concept/code-concept.service'
import { LeavePlaceService } from '../leave/leave-place'
import { InMemorySeparationDetails, InMemorySeparations } from '../testing/in-memory'
import { createLeaveWorld, type LeaveWorld } from '../testing/leave-world'
import { ConflictError, ForbiddenError, InvalidRequestError, NotFoundError } from '../workforce.error'
import { SeparationService } from './separation.service'

describe('SeparationService', () => {
  let world: LeaveWorld
  let separations: InMemorySeparations
  let details: InMemorySeparationDetails
  let service: SeparationService
  const recordAccess = vi.fn()
  const resignation = { system: 'id.separation-type', code: 'resignation' }
  const dismissal = { system: 'id.separation-type', code: 'dismissal' }
  const keys = { system: 'id.exit-checklist-item', code: 'keys' }
  const badge = { system: 'id.exit-checklist-item', code: 'badge_uniform' }

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
   * Records a separation of the nurse as HR.
   *
   * @param override - Fields that replace the defaults.
   * @param employeeId - The employee; the nurse when missing.
   * @returns The separation.
   */
  function create(override: object = {}, employeeId = world.nurse.id) {
    return world.asAdmin(() =>
      service.create(world.tenantId, employeeId, { type: resignation, lastWorkingDay: '2026-12-31', noticeReceivedOn: '2026-11-20', reason: 'Pindah ke kota lain', ...override }),
    )
  }

  /**
   * Adds a code concept.
   *
   * @param system - Code system.
   * @param code - Code.
   * @param properties - Properties.
   * @param status - Status.
   */
  function addConcept(system: string, code: string, properties: Record<string, unknown> = {}, status: 'active' | 'retired' = 'active') {
    return world.seed(() =>
      world.repos.concepts.create({ system, code, display: [{ locale: 'en', text: code }], properties, mappings: [], period: null, status }),
    )
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-23T05:00:00Z'))
    world = await createLeaveWorld()
    separations = new InMemorySeparations()
    details = new InMemorySeparationDetails()
    const logger = { log: world.logs.log, warn: world.logs.warn, error: world.logs.error, debug: world.logs.debug } as never
    service = new SeparationService(
      separations, details, world.repos.employees, world.repos.assignments, new CodeConceptService(world.repos.concepts, logger),
      new LeavePlaceService(world.repos.assignments, world.repos.units, world.repos.facilities), { record: vi.fn(), recordAccess } as never,
      { run: (work: () => Promise<unknown>) => work() } as never, logger,
    )
    await addConcept('id.separation-type', 'resignation', { contract_action: 'end' })
    await addConcept('id.separation-type', 'dismissal', { contract_action: 'terminate' })
    await addConcept('id.separation-type', 'broken', {})
    await addConcept('id.separation-type', 'old', { contract_action: 'end' }, 'retired')
    await addConcept('id.exit-checklist-item', 'keys')
    await addConcept('id.exit-checklist-item', 'badge_uniform')
    await addConcept('id.exit-checklist-item', 'gone', {}, 'retired')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('create', () => {
    it('records a separation with its detail, the facility, the contract action and the checklist, and logs no values', async () => {
      const created = await create()

      expect(created).toMatchObject({
        tenant_id: world.tenantId,
        employee_id: world.nurse.id,
        facility_id: world.facilityId,
        type: resignation,
        contract_action: 'end',
        last_working_day: '2026-12-31',
        notice_received_on: '2026-11-20',
        immediate: false,
        status: 'planned',
        completion: null,
        settlement: null,
      })
      expect(created.checklist.map((entry) => [entry.item.code, entry.done])).toEqual([['badge_uniform', null], ['keys', null]])
      expect(await details.findBySeparation(world.tenantId, created.id)).toMatchObject({ reason: 'Pindah ke kota lain', employee_id: world.nurse.id })
      expect(world.logs.log).toHaveBeenCalledTimes(1)
      expect(world.logs.log.mock.calls[0]?.[0]).toMatchObject({ event: 'separation_create', outcome: 'success' })
      for (const text of ['Pindah', 'resignation', '2026-12-31', world.nurse.id]) {
        expect(world.logs.written()).not.toContain(text)
      }
    })

    it('copies the contract action of the type, so a dismissal terminates', async () => {
      const created = await create({ type: dismissal, immediate: true, lastWorkingDay: '2026-11-23' })

      expect(created).toMatchObject({ contract_action: 'terminate', immediate: true, status: 'planned' })
    })

    it('accepts today as the last working day, no notice date and an immediate one in the past', async () => {
      expect((await create({ lastWorkingDay: '2026-11-23', noticeReceivedOn: undefined })).notice_received_on).toBeNull()
      const other = await world.addEmployee()
      expect((await create({ immediate: true, type: dismissal, lastWorkingDay: '2026-11-01', noticeReceivedOn: '2026-10-25' }, other.id)).last_working_day).toBe('2026-11-01')
    })

    it('refuses a bad type, a past or impossible date, a bad notice date and a missing or long reason, each by code', async () => {
      const code = async (override: object) => ((await rejection(() => create(override))) as InvalidRequestError).code

      expect(await code({ type: { system: 'id.leave-type', code: 'tahunan' } })).toBe('invalid_separation_type')
      expect(await code({ type: { system: 'id.separation-type', code: 'broken' } })).toBe('invalid_separation_type')
      expect(await code({ type: { system: 'id.separation-type', code: 'nope' } })).toBe('unknown_code')
      expect(await code({ type: { system: 'id.separation-type', code: 'old' } })).toBe('code_retired')
      expect(await code({ lastWorkingDay: '2026-11-22' })).toBe('invalid_last_working_day')
      expect(await code({ lastWorkingDay: '2026-02-30' })).toBe('invalid_last_working_day')
      expect(await code({ noticeReceivedOn: '2027-01-01' })).toBe('invalid_notice_date')
      expect(await code({ reason: '  ' })).toBe('reason_required')
      expect(await code({ reason: 'x'.repeat(1001) })).toBe('invalid_reason')
      expect(await separations.findByFilter(world.tenantId)).toEqual([])
    })

    it('answers 404 for a missing, malformed or foreign employee, 422 for one who has separated, and 409 for a second separation', async () => {
      const foreign = await world.addEmployee({ tenant: world.otherTenantId })
      const gone = await world.addEmployee({ status: 'separated' })

      expect(await rejection(() => create({}, new Types.ObjectId().toHexString()))).toBeInstanceOf(NotFoundError)
      expect(await rejection(() => create({}, 'bad'))).toBeInstanceOf(NotFoundError)
      expect(((await rejection(() => create({}, foreign.id))) as NotFoundError).code).toBe('employee_not_found')
      expect(((await rejection(() => create({}, gone.id))) as InvalidRequestError).code).toBe('employee_separated')
      await create()
      const again = await rejection(() => create({ lastWorkingDay: '2027-01-31' }))
      expect(again).toBeInstanceOf(ConflictError)
      expect((again as ConflictError).code).toBe('separation_exists')
    })

    it('allows a new separation after the first was cancelled', async () => {
      const first = await create()
      await world.asAdmin(() => service.cancel(world.tenantId, first.id, { reason: 'Mengundurkan niat' }))

      expect((await create({ lastWorkingDay: '2027-01-31' })).status).toBe('planned')
    })

    it('has no checklist when the tenant has no checklist codes', async () => {
      for (const concept of await world.repos.concepts.findBySystem(world.tenantId, 'id.exit-checklist-item')) {
        await world.seed(() => world.repos.concepts.update(concept.id, { status: 'retired' }))
      }

      expect((await create()).checklist).toEqual([])
    })
  })

  describe('update', () => {
    it('changes the last working day, the type, the notice date and the reason, and keeps the rest', async () => {
      const created = await create()

      const updated = await world.asAdmin(() => service.update(world.tenantId, created.id, { lastWorkingDay: '2027-01-15', type: dismissal, noticeReceivedOn: null, reason: 'Alasan baru' }))

      expect(updated).toMatchObject({ last_working_day: '2027-01-15', type: dismissal, contract_action: 'terminate', notice_received_on: null, status: 'planned' })
      expect((await details.findBySeparation(world.tenantId, created.id))?.reason).toBe('Alasan baru')
      expect(world.logs.log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'separation_update', outcome: 'success' })
      expect(world.logs.written()).not.toContain('Alasan')
    })

    it('refuses an empty change, a bad value, a stale version, a separation that is not planned and an immediate one', async () => {
      const created = await create()
      const immediate = await create({ immediate: true, type: dismissal, lastWorkingDay: '2026-11-23' }, (await world.addEmployee()).id)
      const code = async (id: string, input: object) => ((await rejection(() => world.asAdmin(() => service.update(world.tenantId, id, input as never)))) as { code: string }).code

      expect(await code(created.id, {})).toBe('empty_update')
      expect(await code(created.id, { lastWorkingDay: '2026-11-01' })).toBe('invalid_last_working_day')
      expect(await code(created.id, { noticeReceivedOn: '2027-06-01' })).toBe('invalid_notice_date')
      expect(await code(created.id, { type: { system: 'id.separation-type', code: 'old' } })).toBe('code_retired')
      expect(await code(created.id, { reason: ' ' })).toBe('reason_required')
      expect(await code(created.id, { reason: 'x', version: 99 })).toBe('stale_version')
      expect(await code(immediate.id, { reason: 'x' })).toBe('separation_immediate')
      await world.asAdmin(() => service.cancel(world.tenantId, created.id, { reason: 'x' }))
      expect(await code(created.id, { reason: 'x' })).toBe('separation_not_planned')
    })

    it('answers 404 for a missing, malformed or foreign separation', async () => {
      const created = await create()

      for (const [tenant, id] of [[world.tenantId, new Types.ObjectId().toHexString()], [world.tenantId, 'bad'], [world.otherTenantId, created.id]] as const) {
        const thrown = await rejection(() => world.asAdmin(() => service.update(tenant, id, { reason: 'x' })))
        expect((thrown as NotFoundError).code).toBe('separation_not_found')
      }
    })
  })

  describe('cancel', () => {
    it('cancels a planned separation with a reason and frees the employee for a new one', async () => {
      const created = await create()

      const cancelled = await world.asAdmin(() => service.cancel(world.tenantId, created.id, { reason: 'Mengundurkan niat' }))

      expect(cancelled.status).toBe('cancelled')
      expect(world.logs.log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'separation_cancel', outcome: 'success' })
      expect(world.logs.written()).not.toContain('niat')
    })

    it('needs a reason of 1 to 500 characters, a planned separation and the version read', async () => {
      const created = await create()
      const code = async (input: object) => ((await rejection(() => world.asAdmin(() => service.cancel(world.tenantId, created.id, input as never)))) as { code: string }).code

      expect(await code({})).toBe('reason_required')
      expect(await code({ reason: 'x'.repeat(501) })).toBe('invalid_reason')
      expect(await code({ reason: 'x', version: 99 })).toBe('stale_version')
      await world.asAdmin(() => service.cancel(world.tenantId, created.id, { reason: 'x' }))
      expect(await code({ reason: 'x' })).toBe('separation_not_planned')
    })
  })

  describe('checklist', () => {
    it('marks an item done by the actor and not done again, and keeps the others', async () => {
      const created = await create()

      const done = await world.asAdmin(() => service.setChecklistItem(world.tenantId, created.id, { ...keys, done: true }))
      expect(done.checklist.find((entry) => entry.item.code === 'keys')?.done).toMatchObject({ by: { account_id: 'a1' } })
      expect(done.checklist.find((entry) => entry.item.code === 'badge_uniform')?.done).toBeNull()
      const undone = await world.asAdmin(() => service.setChecklistItem(world.tenantId, created.id, { ...keys, done: false }))
      expect(undone.checklist.find((entry) => entry.item.code === 'keys')?.done).toBeNull()
      expect(world.logs.log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'separation_checklist', outcome: 'success' })
    })

    it('stays open after completion, and refuses a cancelled separation, an unknown item, no actor and an old version', async () => {
      const created = await create()
      const code = async (input: { system: string; code: string; done: boolean }, version?: number) => ((await rejection(() => world.asAdmin(() => service.setChecklistItem(world.tenantId, created.id, input, version)))) as { code: string }).code

      expect(await code({ ...badge, code: 'nothing', done: true })).toBe('checklist_item_not_found')
      expect(await code({ ...keys, done: true }, 99)).toBe('stale_version')
      expect(((await rejection(() => service.setChecklistItem(world.tenantId, created.id, { ...keys, done: true }))) as ForbiddenError).code).toBe('actor_required')
      await world.seed(() => separations.update(created.id, { status: 'completed' }))
      expect((await world.asAdmin(() => service.setChecklistItem(world.tenantId, created.id, { ...keys, done: true }))).status).toBe('completed')
      await world.seed(() => separations.update(created.id, { status: 'cancelled' }))
      expect(await code({ ...keys, done: true })).toBe('separation_cancelled')
    })
  })

  describe('reads', () => {
    it('lists by last working day with filters and paging, and writes no log', async () => {
      const second = await world.addEmployee()
      const third = await world.addEmployee()
      const first = await create({ lastWorkingDay: '2026-12-31' })
      await create({ lastWorkingDay: '2027-02-28', type: dismissal, immediate: false }, second.id)
      await create({ lastWorkingDay: '2027-01-31' }, third.id)
      await world.seed(() => separations.update(first.id, { status: 'completed' }))
      vi.clearAllMocks()

      const all = await service.list(world.tenantId, {})
      const planned = await service.list(world.tenantId, { status: 'planned' })
      const byType = await service.list(world.tenantId, { typeCode: 'dismissal' })
      const range = await service.list(world.tenantId, { from: '2027-01-01', to: '2027-01-31' })
      const page = await service.list(world.tenantId, { limit: 1, offset: 1 })
      const foreign = await service.list(world.otherTenantId, {})

      expect(all.map((item) => item.last_working_day)).toEqual(['2027-02-28', '2027-01-31', '2026-12-31'])
      expect(planned).toHaveLength(2)
      expect(byType.map((item) => item.employee_id)).toEqual([second.id])
      expect(range.map((item) => item.employee_id)).toEqual([third.id])
      expect(page.map((item) => item.last_working_day)).toEqual(['2027-01-31'])
      expect(foreign).toEqual([])
      expect(JSON.stringify(all)).not.toContain('Pindah')
      expect(world.logs.written()).toBe('[[],[],[],[]]')
    })

    it('lists the separations of the employees of a unit, and none for a unit with nobody', async () => {
      const outsider = await world.addEmployee()
      await create({}, world.nurse.id)
      await create({}, outsider.id)

      expect((await service.list(world.tenantId, { unitId: world.ward.id })).map((item) => item.employee_id)).toEqual([world.nurse.id])
      expect(await service.list(world.tenantId, { unitId: world.parent.id })).toEqual([])
      expect(await service.list(world.tenantId, { unitId: new Types.ObjectId().toHexString() })).toEqual([])
    })

    it('reads one separation without its reason, and 404 for a missing, malformed or foreign id', async () => {
      const created = await create()

      expect(await service.get(world.tenantId, created.id)).toMatchObject({ id: created.id })
      expect(JSON.stringify(await service.get(world.tenantId, created.id))).not.toContain('Pindah')
      for (const [tenant, id] of [[world.tenantId, 'bad'], [world.otherTenantId, created.id]] as const) {
        expect(((await rejection(() => service.get(tenant, id))) as NotFoundError).code).toBe('separation_not_found')
      }
    })

    it('shows the reason and records one access entry each time, and returns nothing when recording fails', async () => {
      const created = await create()
      const detail = await details.findBySeparation(world.tenantId, created.id)

      expect(await service.details(world.tenantId, created.id)).toEqual({ reason: 'Pindah ke kota lain' })
      expect(await service.details(world.tenantId, created.id)).toEqual({ reason: 'Pindah ke kota lain' })
      expect(recordAccess).toHaveBeenCalledTimes(2)
      expect(recordAccess).toHaveBeenCalledWith({ type: 'separation_detail', id: detail?.id, operation: 'SeparationService.details', tenantId: world.tenantId })
      recordAccess.mockRejectedValueOnce(new Error('change log down'))
      expect(await rejection(() => service.details(world.tenantId, created.id))).toBeInstanceOf(Error)
      expect(((await rejection(() => service.details(world.otherTenantId, created.id))) as NotFoundError).code).toBe('separation_not_found')
      expect(recordAccess).toHaveBeenCalledTimes(3)
    })
  })

  it('runs every write as a signed-in request, so the change history has an actor', async () => {
    const created = await runWithRequestContext({ correlationId: 'c', actor: { account_id: 'hr', display_name: 'HR', kind: 'account' } }, () =>
      service.create(world.tenantId, world.nurse.id, { type: resignation, lastWorkingDay: '2026-12-31', reason: 'x' }),
    )

    expect(created.status).toBe('planned')
  })
})
