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
import { type PositionRepository } from '@repository/interface/position'
import { REPOSITORY_POSITION } from '@repository/token'
import { PositionRepositoryModule } from './position.module'
import { PositionEntity } from './schema/position'

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
    limit: () => self,
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const positionId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: positionId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 1,
  unit_id: unitId,
  code: 'kepala-ruangan',
  title: [{ locale: 'id-ID', text: 'Kepala Ruangan' }],
  kind: 'structural',
  is_head_of_unit: true,
  allowed_professions: [{ system: 'id.profession', code: 'perawat' }],
  grade: { system: 'rs.job-grade', code: 'g5', display: 'G5' },
  budgeted_headcount: 1,
  job_description: null,
  period: { start: '2026-01-01', end: null },
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('PositionRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: positionId }),
      })),
    ),
  }
  let positions: PositionRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    unit_id: unitId.toHexString(),
    code: 'perawat-pelaksana',
    title: [{ locale: 'en', text: 'Staff Nurse' }],
    kind: 'functional' as const,
    is_head_of_unit: false,
    allowed_professions: [],
    grade: null,
    budgeted_headcount: 4,
    job_description: null,
    period: { start: '2026-01-01', end: null },
    status: 'active' as const,
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
            _id: positionId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PositionRepositoryModule],
    })
      .overrideProvider(
        getModelToken(PositionEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    positions = moduleRef.get(REPOSITORY_POSITION)
  })

  it('maps a stored position to the model without storage fields', async () => {
    const position = await positions.findOne(positionId.toHexString())

    expect(position).toMatchObject({
      id: positionId.toHexString(),
      unit_id: unitId.toHexString(),
      code: 'kepala-ruangan',
      kind: 'structural',
      is_head_of_unit: true,
      allowed_professions: [{ system: 'id.profession', code: 'perawat' }],
      grade: { system: 'rs.job-grade', code: 'g5', display: 'G5' },
      job_description: null,
      period: { start: '2026-01-01', end: null },
    })
    expect(JSON.stringify(position)).not.toContain('"_id"')
    expect(JSON.stringify(position)).not.toContain('__v')
  })

  it('maps a position without a grade to null', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, grade: null }))

    expect(
      (await positions.findOne(positionId.toHexString()))?.grade,
    ).toBeNull()
  })

  it('stamps a created position with the actor and records one change entry', async () => {
    await asAdmin(() => positions.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'position' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(positions.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(asAdmin(() => positions.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('finds by unit and code, the active head and the active positions, and ignores malformed ids', async () => {
    const found = await positions.findByCode(
      tenantId.toHexString(),
      unitId.toHexString(),
      'kepala-ruangan',
    )
    const head = await positions.findActiveHead(
      tenantId.toHexString(),
      unitId.toHexString(),
    )
    const active = await positions.findActiveByUnit(
      tenantId.toHexString(),
      unitId.toHexString(),
      5,
    )

    expect(found?.code).toBe('kepala-ruangan')
    expect(head?.is_head_of_unit).toBe(true)
    expect(active).toHaveLength(1)
    expect(model.findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ code: 'kepala-ruangan', deleted_at: null }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        is_head_of_unit: true,
        status: 'active',
        deleted_at: null,
      }),
    )
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', deleted_at: null }),
    )
    expect(
      await positions.findByCode('x', unitId.toHexString(), 'a'),
    ).toBeNull()
    expect(
      await positions.findActiveHead(tenantId.toHexString(), 'x'),
    ).toBeNull()
    expect(await positions.findActiveByUnit('x', 'y')).toEqual([])
  })

  it('updates only the editable fields, never unit, code, kind or the head flag', async () => {
    await asAdmin(() =>
      positions.update(positionId.toHexString(), {
        budgeted_headcount: 2,
        unit_id: new Types.ObjectId().toHexString(),
        code: 'hacked',
        kind: 'functional',
        is_head_of_unit: false,
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('budgeted_headcount', 2)
    for (const forbidden of ['unit_id', 'code', 'kind', 'is_head_of_unit']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('clears the grade when null is written', async () => {
    await asAdmin(() =>
      positions.update(positionId.toHexString(), { grade: null }),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('grade', null)
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(chain(null))

    await expect(
      asAdmin(() =>
        positions.update(
          positionId.toHexString(),
          { status: 'closed' },
          { expectedVersion: 0 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => positions.delete(positionId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => positions.deleteSoft(positionId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
