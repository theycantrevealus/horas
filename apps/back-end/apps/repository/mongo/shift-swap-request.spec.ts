import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { Types } from 'mongoose'
import { ChangeLogConfig } from '@configuration/change-log'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { RepositoryError } from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { runWithRequestContext } from '@utility/logger/context'
import { type ShiftSwapRequestRepository } from '@repository/interface/shift-swap-request'
import { REPOSITORY_SHIFT_SWAP_REQUEST } from '@repository/token'
import { ShiftSwapRequestRepositoryModule } from './shift-swap-request.module'
import { ShiftSwapRequestEntity } from './schema/shift-swap-request'

/**
 * Records appended to the fake outbox.
 */
const appended: ChangeRecord[] = []

/**
 * Stand-in for the global connection module: outbox, transactions and configuration.
 */
@Global()
@Module({
  providers: [
    {
      provide: CHANGE_OUTBOX,
      useValue: {
        append: async (record: ChangeRecord) => void appended.push(record),
      },
    },
    {
      provide: TRANSACTION_MANAGER,
      useValue: { run: (work: () => Promise<unknown>) => work() },
    },
    { provide: ChangeLogConfig.KEY, useValue: { recordMaxBytes: 200_000 } },
  ],
  exports: [CHANGE_OUTBOX, TRANSACTION_MANAGER, ChangeLogConfig.KEY],
})
class FakeConnectionModule {}

/**
 * Runs `work` as a signed-in request.
 *
 * @param work - Code to run.
 * @returns What `work` returns.
 */
function asAdmin<T>(work: () => Promise<T>): Promise<T> {
  return runWithRequestContext(
    {
      correlationId: 'c1',
      actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
    },
    work,
  )
}

/**
 * Wraps a value as a chainable Mongoose query (`.sort().limit().lean().exec()`).
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function chain(value: unknown) {
  const self = {
    sort: () => self,
    skip: () => self,
    limit: () => self,
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const rosterId = new Types.ObjectId()
const requesterId = new Types.ObjectId()
const counterpartId = new Types.ObjectId()
const requesterAssignmentId = new Types.ObjectId()
const swapId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: swapId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  unit_id: unitId,
  roster_id: rosterId,
  requester: { employee_id: requesterId, assignment_id: requesterAssignmentId },
  counterpart: { employee_id: counterpartId, assignment_id: null },
  reason: 'Keperluan keluarga',
  status: 'requested',
  counterpart_accepted_at: null,
  decision: null,
  resulting_assignment_ids: [],
  created_by: actor,
  created_at: new Date('2027-03-01T00:00:00Z'),
  updated_at: new Date('2027-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('ShiftSwapRequestRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    ),
  }
  let swaps: ShiftSwapRequestRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    unit_id: unitId.toHexString(),
    roster_id: rosterId.toHexString(),
    requester: { employee_id: requesterId.toHexString(), assignment_id: requesterAssignmentId.toHexString() },
    counterpart: { employee_id: counterpartId.toHexString(), assignment_id: null },
    reason: 'Keperluan keluarga',
    status: 'requested' as const,
    counterpart_accepted_at: null,
    decision: null,
    resulting_assignment_ids: [],
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, ShiftSwapRequestRepositoryModule],
    })
      .overrideProvider(getModelToken(ShiftSwapRequestEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    swaps = moduleRef.get(REPOSITORY_SHIFT_SWAP_REQUEST)
  })

  it('maps a stored request to the model without storage fields', async () => {
    const found = await swaps.findOne(swapId.toHexString())

    expect(found).toMatchObject({
      id: swapId.toHexString(),
      tenant_id: tenantId.toHexString(),
      unit_id: unitId.toHexString(),
      roster_id: rosterId.toHexString(),
      requester: { employee_id: requesterId.toHexString(), assignment_id: requesterAssignmentId.toHexString() },
      counterpart: { employee_id: counterpartId.toHexString(), assignment_id: null },
      reason: 'Keperluan keluarga',
      status: 'requested',
      counterpart_accepted_at: null,
      decision: null,
      resulting_assignment_ids: [],
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a decided request with a counterpart assignment and resulting assignments', async () => {
    const other = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        status: 'approved',
        counterpart: { employee_id: counterpartId, assignment_id: other },
        counterpart_accepted_at: new Date('2027-03-02T00:00:00Z'),
        decision: { by: actor, at: new Date('2027-03-03T00:00:00Z'), reason: null },
        resulting_assignment_ids: [other],
      }),
    )

    const found = await swaps.findOne(swapId.toHexString())

    expect(found).toMatchObject({
      status: 'approved',
      counterpart: { assignment_id: other.toHexString() },
      counterpart_accepted_at: new Date('2027-03-02T00:00:00Z'),
      decision: { by: actor, at: new Date('2027-03-03T00:00:00Z'), reason: null },
      resulting_assignment_ids: [other.toHexString()],
    })
  })

  it('lists with its filters, either side of an employee, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await swaps.findByFilter(tenant, { unitId: unitId.toHexString(), rosterId: rosterId.toHexString(), status: 'requested', employeeId: requesterId.toHexString(), limit: 5, offset: 5 })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        unit_id: unitId.toHexString(),
        roster_id: rosterId.toHexString(),
        status: 'requested',
        deleted_at: null,
        $or: [{ 'requester.employee_id': requesterId.toHexString() }, { 'counterpart.employee_id': requesterId.toHexString() }],
      }),
    )
    model.find.mockClear()
    for (const query of [{ unitId: 'bad' }, { rosterId: 'bad' }, { employeeId: 'bad' }]) {
      expect(await swaps.findByFilter(tenant, query)).toEqual([])
    }
    expect(await swaps.findByFilter('bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the open requests of some assignments, and nothing for none or a malformed id', async () => {
    const id = requesterAssignmentId.toHexString()
    await swaps.findOpenByAssignments(tenantId.toHexString(), [id])

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: { $in: ['requested', 'accepted_by_counterpart'] },
        $or: [{ 'requester.assignment_id': { $in: [id] } }, { 'counterpart.assignment_id': { $in: [id] } }],
      }),
    )
    model.find.mockClear()
    expect(await swaps.findOpenByAssignments(tenantId.toHexString(), [])).toEqual([])
    expect(await swaps.findOpenByAssignments(tenantId.toHexString(), ['bad'])).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created request with the actor and records one change entry', async () => {
    await asAdmin(() => swaps.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'shift_swap_request' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(swaps.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('updates only the status, the answer, the decision and the resulting assignments', async () => {
    await asAdmin(() =>
      swaps.update(swapId.toHexString(), {
        status: 'accepted_by_counterpart',
        counterpart_accepted_at: new Date(),
        decision: null,
        resulting_assignment_ids: [],
        reason: 'Lain',
        unit_id: new Types.ObjectId().toHexString(),
        roster_id: new Types.ObjectId().toHexString(),
        requester: input.requester,
        counterpart: null,
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['status', 'counterpart_accepted_at', 'decision', 'resulting_assignment_ids']))
    for (const forbidden of ['reason', 'unit_id', 'roster_id', 'requester', 'counterpart']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => swaps.delete(swapId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
