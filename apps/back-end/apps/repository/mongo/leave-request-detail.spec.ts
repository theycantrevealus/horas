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
import { type LeaveRequestDetailRepository } from '@repository/interface/leave-request-detail'
import { REPOSITORY_LEAVE_REQUEST_DETAIL } from '@repository/token'
import { LeaveRequestDetailRepositoryModule } from './leave-request-detail.module'
import { LeaveRequestDetailEntity, LeaveRequestDetailSchema } from './schema/leave-request-detail'

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
 * Casts identifier strings to ObjectIds the way Mongoose does for ObjectId paths.
 *
 * @param document - Document being created.
 * @returns The document with ObjectId values for fields ending in `_id`.
 */
function castIds(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [
      key,
      key.endsWith('_id') && typeof value === 'string'
        ? new Types.ObjectId(value)
        : value,
    ]),
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
    sort: vi.fn(() => self),
    skip: () => self,
    limit: vi.fn(() => self),
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const requestId = new Types.ObjectId()
const detailId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const proof = { file_id: 'f1', content_type: 'application/pdf', sha256: 'a'.repeat(64) }
const stored = {
  _id: detailId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  request_id: requestId,
  employee_id: employeeId,
  reason: 'Keperluan keluarga',
  proof: null,
  created_by: actor,
  created_at: new Date('2026-11-19T05:00:00Z'),
  updated_at: new Date('2026-11-19T05:00:00Z'),
  deleted_at: null,
}

describe('LeaveRequestDetailRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: detailId }),
      })),
    ),
  }
  let details: LeaveRequestDetailRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    request_id: requestId.toHexString(),
    employee_id: employeeId.toHexString(),
    reason: 'Keperluan keluarga',
    proof,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({ toObject: () => ({ ...stored, ...castIds(document), _id: detailId }) })),
    )
    const moduleRef = await Test.createTestingModule({ imports: [FakeConnectionModule, LeaveRequestDetailRepositoryModule] })
      .overrideProvider(getModelToken(LeaveRequestDetailEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    details = moduleRef.get(REPOSITORY_LEAVE_REQUEST_DETAIL)
  })

  it('pins the collection name leave_request_details and a unique request per tenant', () => {
    expect(LeaveRequestDetailSchema.get('collection')).toBe('leave_request_details')
    expect(LeaveRequestDetailSchema.indexes()).toContainEqual([
      { tenant_id: 1, request_id: 1 },
      expect.objectContaining({ unique: true }),
    ])
  })

  it('maps a stored detail to the model without storage fields', async () => {
    const found = await details.findOne(detailId.toHexString())

    expect(found).toMatchObject({
      id: detailId.toHexString(),
      tenant_id: tenantId.toHexString(),
      request_id: requestId.toHexString(),
      employee_id: employeeId.toHexString(),
      reason: 'Keperluan keluarga',
      proof: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    model.findOne.mockReturnValueOnce(chain({ ...stored, proof }))
    expect((await details.findOne(detailId.toHexString()))?.proof).toMatchObject({ file_id: 'f1', content_type: 'application/pdf' })
  })

  it('records one change entry of type leave_request_detail with the reason and the proof masked as highly confidential', async () => {
    await asAdmin(() => details.create(input))

    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'leave_request_detail' } })
    const changes = appended[0]?.changes ?? []
    expect(changes.find((change) => change.path === 'reason')).toMatchObject({ class: 'highly_confidential' })
    const proofChanges = changes.filter((change) => change.path.startsWith('proof'))
    expect(proofChanges.length).toBeGreaterThan(0)
    expect(proofChanges.every((change) => change.class === 'highly_confidential')).toBe(true)
    expect(JSON.stringify(appended[0])).not.toContain('Keperluan keluarga')
  })

  it('finds the detail of a request, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()

    expect(await details.findByRequest(tenant, requestId.toHexString())).toMatchObject({ request_id: requestId.toHexString() })
    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, request_id: requestId.toHexString(), deleted_at: null }))
    model.find.mockClear()
    model.find.mockReturnValueOnce(chain([]))
    expect(await details.findByRequest(tenant, requestId.toHexString())).toBeNull()
    expect(await details.findByRequest('x', requestId.toHexString())).toBeNull()
    expect(await details.findByRequest(tenant, 'bad')).toBeNull()
  })

  it('updates only the proof, never the reason or the request', async () => {
    await asAdmin(() =>
      details.update(detailId.toHexString(), { proof, reason: 'Diubah', request_id: new Types.ObjectId().toHexString() }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toContain('proof')
    for (const forbidden of ['reason', 'request_id', 'employee_id']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete and refuses to write without an acting account', async () => {
    await expect(details.create(input)).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => details.delete(detailId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
