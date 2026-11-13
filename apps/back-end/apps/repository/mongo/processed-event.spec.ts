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
import { type ProcessedEventRepository } from '@repository/interface/processed-event'
import { REPOSITORY_PROCESSED_EVENT } from '@repository/token'
import { ProcessedEventRepositoryModule } from './processed-event.module'
import { ProcessedEventEntity } from './schema/processed-event'

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
const recordId = new Types.ObjectId()
const actor = { account_id: null, display_name: 'event-relay', kind: 'system' }
const stored = {
  _id: recordId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  consumer: 'identity.workforce-events',
  event_id: 'e-1',
  event_type: 'workforce.employee.status_changed',
  processed_at: new Date('2026-03-10T12:00:00Z'),
  expires_at: new Date('2026-04-09T12:00:00Z'),
  created_by: actor,
  created_at: new Date('2026-03-10T12:00:00Z'),
  updated_at: new Date('2026-03-10T12:00:00Z'),
  deleted_at: null,
}

describe('ProcessedEventRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({
          ...stored,
          ...document,
          tenant_id: tenantId,
          _id: recordId,
        }),
      })),
    ),
  }
  let processed: ProcessedEventRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    consumer: 'identity.workforce-events',
    event_id: 'e-2',
    event_type: 'workforce.employee.status_changed',
    processed_at: new Date('2026-03-10T12:00:00Z'),
    expires_at: new Date('2026-04-09T12:00:00Z'),
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...document,
            tenant_id: tenantId,
            _id: recordId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, ProcessedEventRepositoryModule],
    })
      .overrideProvider(
        getModelToken(ProcessedEventEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    processed = moduleRef.get(REPOSITORY_PROCESSED_EVENT)
  })

  it('finds the record of a consumer and event, without storage fields, and null for none', async () => {
    const found = await processed.findByEvent(
      'identity.workforce-events',
      'e-1',
    )

    expect(found).toMatchObject({
      id: recordId.toHexString(),
      tenant_id: tenantId.toHexString(),
      consumer: 'identity.workforce-events',
      event_id: 'e-1',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        consumer: 'identity.workforce-events',
        event_id: 'e-1',
        deleted_at: null,
      }),
    )
    model.findOne.mockReturnValueOnce(chain(null))
    expect(await processed.findByEvent('c', 'none')).toBeNull()
  })

  it('creates a record without recording a change, since it is not business data', async () => {
    await asAdmin(() => processed.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({
        consumer: 'identity.workforce-events',
        schema_version: 1,
      }),
    ])
    expect(appended).toHaveLength(0)
  })

  it('translates a duplicate consumer and event into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 dup', code: 11000 }),
    )

    await expect(asAdmin(() => processed.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('refuses to write without an acting account, and does not support update or delete', async () => {
    await expect(processed.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
    const writes: (() => Promise<unknown>)[] = [
      () => processed.update(recordId.toHexString(), {}),
      () => processed.delete(recordId.toHexString()),
      () => processed.deleteSoft(recordId.toHexString()),
    ]
    for (const work of writes) {
      await expect(asAdmin(work)).rejects.toBeInstanceOf(RepositoryError)
    }
  })
})
