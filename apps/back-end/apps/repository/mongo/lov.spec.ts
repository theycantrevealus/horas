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
import { withChangeReason } from '@utility/history/reason'
import { runWithRequestContext } from '@utility/logger/context'
import { type LovRepository } from '@repository/interface/lov'
import { REPOSITORY_LOV } from '@repository/token'
import { LovRepositoryModule } from './lov.module'
import { LovEntity } from './schema/lov'

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
 * Wraps a value as a Mongoose query (`.lean().exec()` and `.exec()`).
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function query(value: unknown) {
  return { lean: () => ({ exec: async () => value }), exec: async () => value }
}

const id = new Types.ObjectId()
const stored = {
  _id: id,
  group_name: 'gender',
  set_value: 'M',
  description: 'Male',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('LOVRepositoryMongo change recording', () => {
  let repository: LovRepository
  const lovModel = {
    findOne: vi.fn(() => query(stored)),
    findOneAndUpdate: vi.fn(() =>
      query({ ...stored, description: 'Laki-laki' }),
    ),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...document }),
      })),
    ),
    deleteOne: vi.fn(() => query({ deletedCount: 1 })),
    updateOne: vi.fn(() => query({ matchedCount: 1 })),
  }

  beforeEach(async () => {
    appended.length = 0
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, LovRepositoryModule],
    })
      .overrideProvider(getModelToken(LovEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(lovModel)
      .compile()
    repository = moduleRef.get(REPOSITORY_LOV)
  })

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

  it('records an update with the changed field, actor and reason', async () => {
    await asAdmin(() =>
      withChangeReason('Translate labels', () =>
        repository.update(id.toHexString(), { description: 'Laki-laki' }),
      ),
    )
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      tenant_id: 'platform',
      entity: { type: 'lov', id: id.toHexString() },
      action: 'update',
      reason: 'Translate labels',
      operation: 'LovRepository.update',
      changes: [
        {
          path: 'description',
          class: 'public',
          before: 'Male',
          after: 'Laki-laki',
        },
      ],
    })
  })

  it('records a create, a soft delete and a delete', async () => {
    await asAdmin(async () => {
      await repository.create({
        group_name: 'gender',
        set_value: 'F',
        description: 'Female',
      })
      await repository.deleteSoft(id.toHexString())
      await repository.delete(id.toHexString())
    })
    expect(appended.map((record) => record.action)).toEqual([
      'create',
      'soft_delete',
      'delete',
    ])
  })

  it('rejects a write without an actor', async () => {
    await expect(
      repository.update(id.toHexString(), { description: 'x' }),
    ).rejects.toBeInstanceOf(RepositoryError)
    expect(appended).toHaveLength(0)
  })
})
