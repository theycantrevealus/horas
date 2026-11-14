import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { mongo, Types } from 'mongoose'
import { ChangeLogConfig } from '@configuration/change-log'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { runWithRequestContext } from '@utility/logger/context'
import { type CpdRecordRepository } from '@repository/interface/cpd-record'
import { REPOSITORY_CPD_RECORD } from '@repository/token'
import { CpdRecordRepositoryModule } from './cpd-record.module'
import { CpdRecordEntity } from './schema/cpd-record'

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
    sort: () => self,
    skip: () => self,
    limit: () => self,
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const recordId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: recordId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  credit_system: { system: 'id.credit-system', code: 'skp' },
  activity: {
    title: 'Seminar',
    category: { system: 'id.cpd-category', code: 'learning' },
    provider: 'IDI',
  },
  activity_date: '2026-02-01',
  points: 12.5,
  evidence: { file_id: 'f1', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
  source: 'manual',
  status: 'submitted',
  created_by: actor,
  created_at: new Date('2026-02-01T00:00:00Z'),
  updated_at: new Date('2026-02-01T00:00:00Z'),
  deleted_at: null,
}

describe('CpdRecordRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: recordId }),
      })),
    ),
  }
  let records: CpdRecordRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    credit_system: { system: 'id.credit-system', code: 'skp' },
    activity: {
      title: 'Workshop',
      category: { system: 'id.cpd-category', code: 'service' },
      provider: null,
    },
    activity_date: '2026-03-01',
    points: 5,
    evidence: null,
    source: 'manual' as const,
    status: 'accepted' as const,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: recordId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CpdRecordRepositoryModule],
    })
      .overrideProvider(getModelToken(CpdRecordEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    records = moduleRef.get(REPOSITORY_CPD_RECORD)
  })

  it('maps a stored record to the model without storage fields', async () => {
    const record = await records.findOne(recordId.toHexString())

    expect(record).toMatchObject({
      id: recordId.toHexString(),
      employee_id: employeeId.toHexString(),
      credit_system: { code: 'skp' },
      activity: { title: 'Seminar', category: { code: 'learning' }, provider: 'IDI' },
      activity_date: '2026-02-01',
      points: 12.5,
      evidence: { file_id: 'f1' },
      source: 'manual',
      status: 'submitted',
    })
    expect(JSON.stringify(record)).not.toContain('"_id"')
    expect(JSON.stringify(record)).not.toContain('__v')
  })

  it('maps a record without evidence', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, evidence: null }))

    expect(await records.findOne(recordId.toHexString())).toMatchObject({
      evidence: null,
    })
  })

  it('stamps a created record with the actor and records one change entry', async () => {
    await asAdmin(() => records.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'cpd_record' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(records.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(asAdmin(() => records.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('lists an employee’s records with the filters, and answers an empty list for malformed ids', async () => {
    await records.findByEmployee(tenantId.toHexString(), employeeId.toHexString(), {
      creditSystem: 'skp',
      status: 'accepted',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: employeeId.toHexString(),
        'credit_system.code': 'skp',
        status: 'accepted',
        deleted_at: null,
      }),
    )
    expect(await records.findByEmployee('x', 'y')).toEqual([])
    expect(model.find).toHaveBeenCalledTimes(1)
  })

  it('updates only the status, never the points, the activity or the employee', async () => {
    await asAdmin(() =>
      records.update(recordId.toHexString(), {
        status: 'rejected',
        points: 999,
        employee_id: new Types.ObjectId().toHexString(),
        activity_date: '2000-01-01',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(update.$set).toHaveProperty('status', 'rejected')
    for (const forbidden of ['points', 'employee_id', 'activity_date']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => records.delete(recordId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
