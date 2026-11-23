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
import { type SeparationDetailRepository } from '@repository/interface/separation-detail'
import { REPOSITORY_SEPARATION_DETAIL } from '@repository/token'
import { SeparationDetailRepositoryModule } from './separation-detail.module'
import { SeparationDetailEntity, SeparationDetailSchema } from './schema/separation-detail'

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
const separationId = new Types.ObjectId()
const detailId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: detailId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  separation_id: separationId,
  employee_id: employeeId,
  reason: 'Pindah ke kota lain',
  created_by: actor,
  created_at: new Date('2026-11-23T05:00:00Z'),
  updated_at: new Date('2026-11-23T05:00:00Z'),
  deleted_at: null,
}

describe('SeparationDetailRepository on the shared Mongo base', () => {
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
  let details: SeparationDetailRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    separation_id: separationId.toHexString(),
    employee_id: employeeId.toHexString(),
    reason: 'Pindah ke kota lain',
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain({ ...stored, reason: 'Diubah' }))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({ toObject: () => ({ ...stored, ...castIds(document), _id: detailId }) })),
    )
    const moduleRef = await Test.createTestingModule({ imports: [FakeConnectionModule, SeparationDetailRepositoryModule] })
      .overrideProvider(getModelToken(SeparationDetailEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    details = moduleRef.get(REPOSITORY_SEPARATION_DETAIL)
  })

  it('pins the collection name separation_details and a unique separation per tenant', () => {
    expect(SeparationDetailSchema.get('collection')).toBe('separation_details')
    expect(SeparationDetailSchema.indexes()).toContainEqual([
      { tenant_id: 1, separation_id: 1 },
      expect.objectContaining({ unique: true }),
    ])
  })

  it('maps a stored detail to the model without storage fields', async () => {
    const found = await details.findOne(detailId.toHexString())

    expect(found).toMatchObject({ id: detailId.toHexString(), separation_id: separationId.toHexString(), employee_id: employeeId.toHexString(), reason: 'Pindah ke kota lain' })
    expect(JSON.stringify(found)).not.toContain('"_id"')
  })

  it('records one change entry of type separation_detail with the reason masked as highly confidential', async () => {
    await asAdmin(() => details.create(input))

    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'separation_detail' } })
    const reason = (appended[0]?.changes ?? []).find((change) => change.path === 'reason')
    expect(reason).toMatchObject({ class: 'highly_confidential' })
    expect(JSON.stringify(appended[0])).not.toContain('Pindah ke kota lain')
  })

  it('finds the detail of a separation, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()

    expect(await details.findBySeparation(tenant, separationId.toHexString())).toMatchObject({ separation_id: separationId.toHexString() })
    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, separation_id: separationId.toHexString(), deleted_at: null }))
    model.find.mockReturnValueOnce(chain([]))
    expect(await details.findBySeparation(tenant, separationId.toHexString())).toBeNull()
    expect(await details.findBySeparation('x', separationId.toHexString())).toBeNull()
    expect(await details.findBySeparation(tenant, 'bad')).toBeNull()
  })

  it('updates only the reason, never the separation or the employee', async () => {
    await asAdmin(() =>
      details.update(detailId.toHexString(), { reason: 'Diubah', separation_id: new Types.ObjectId().toHexString() }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toContain('reason')
    for (const forbidden of ['separation_id', 'employee_id']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete and refuses to write without an acting account', async () => {
    await expect(details.create(input)).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => details.delete(detailId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
