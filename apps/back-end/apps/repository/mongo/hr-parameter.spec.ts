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
import { type HrParameterRepository } from '@repository/interface/hr-parameter'
import { REPOSITORY_HR_PARAMETER } from '@repository/token'
import { HrParameterRepositoryModule } from './hr-parameter.module'
import { HrParameterEntity } from './schema/hr-parameter'

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
const facilityId = new Types.ObjectId()
const parameterId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: parameterId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  key: 'MAX_WEEKLY_HOURS',
  scope: { kind: 'facility', id: facilityId },
  value: 37.5,
  effective_from: '2026-12-01',
  notes: 'PKB article 12',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('HrParameterRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    countDocuments: vi.fn((..._args: unknown[]) => chain(1)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: parameterId }),
      })),
    ),
  }
  let parameters: HrParameterRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    key: 'MAX_WEEKLY_HOURS',
    scope: { kind: 'tenant' as const, id: null },
    value: 40,
    effective_from: '2026-12-01',
    notes: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.countDocuments.mockImplementation(() => chain(1))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: parameterId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, HrParameterRepositoryModule],
    })
      .overrideProvider(
        getModelToken(HrParameterEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    parameters = moduleRef.get(REPOSITORY_HR_PARAMETER)
  })

  it('maps a stored value to the model, with the scope id as text, without storage fields', async () => {
    const parameter = await parameters.findOne(parameterId.toHexString())

    expect(parameter).toMatchObject({
      id: parameterId.toHexString(),
      key: 'MAX_WEEKLY_HOURS',
      scope: { kind: 'facility', id: facilityId.toHexString() },
      value: 37.5,
      effective_from: '2026-12-01',
      notes: 'PKB article 12',
    })
    expect(JSON.stringify(parameter)).not.toContain('"_id"')
    expect(JSON.stringify(parameter)).not.toContain('__v')
  })

  it('maps a tenant scope without an id to null', async () => {
    model.findOne.mockReturnValueOnce(
      chain({ ...stored, scope: { kind: 'tenant', id: null } }),
    )

    const parameter = await parameters.findOne(parameterId.toHexString())

    expect(parameter?.scope).toEqual({ kind: 'tenant', id: null })
  })

  it('keeps a false or zero value', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, value: false }))

    expect((await parameters.findOne(parameterId.toHexString()))?.value).toBe(
      false,
    )
  })

  it('stamps a created value with the actor and records one change entry', async () => {
    await asAdmin(() => parameters.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'hr_parameter' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(parameters.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key, scope and date into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(
      asAdmin(() => parameters.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('finds every value of a key in the tenant, and the value of a key, scope and date', async () => {
    const all = await parameters.findByKey(
      tenantId.toHexString(),
      'MAX_WEEKLY_HOURS',
    )
    const one = await parameters.findOneAt(
      tenantId.toHexString(),
      'MAX_WEEKLY_HOURS',
      { kind: 'facility', id: facilityId.toHexString() },
      '2026-12-01',
    )
    const tenantWide = await parameters.findOneAt(
      tenantId.toHexString(),
      'MAX_WEEKLY_HOURS',
      { kind: 'tenant', id: null },
      '2026-12-01',
    )

    expect(all).toHaveLength(1)
    expect(one?.effective_from).toBe('2026-12-01')
    expect(tenantWide).not.toBeNull()
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'MAX_WEEKLY_HOURS',
        deleted_at: null,
      }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ 'scope.kind': 'tenant', 'scope.id': null }),
    )
  })

  it('answers empty or null for malformed ids', async () => {
    expect(await parameters.findByKey('x', 'MAX_WEEKLY_HOURS')).toEqual([])
    expect(
      await parameters.findOneAt(
        tenantId.toHexString(),
        'K',
        { kind: 'unit', id: 'x' },
        '2026-12-01',
      ),
    ).toBeNull()
    const page = await parameters.findPage('x', {})
    expect(page.data).toEqual([])
    expect(
      (await parameters.findPage(tenantId.toHexString(), { scopeId: 'x' }))
        .totalRecords,
    ).toBe(0)
    expect(model.find).not.toHaveBeenCalled()
  })

  it('pages the values with the filters and counts the total', async () => {
    const page = await parameters.findPage(tenantId.toHexString(), {
      key: 'MAX_WEEKLY_HOURS',
      scopeKind: 'facility',
      scopeId: facilityId.toHexString(),
      limit: 5,
      offset: 5,
    })

    expect(page).toMatchObject({
      totalRecords: 1,
      first: 5,
      rows: 5,
      currentPage: 2,
    })
    expect(page.data).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'MAX_WEEKLY_HOURS',
        'scope.kind': 'facility',
        'scope.id': facilityId.toHexString(),
        deleted_at: null,
      }),
    )
  })

  it('does not support update, delete or soft delete: values are append-only', async () => {
    await expect(
      asAdmin(() => parameters.update(parameterId.toHexString(), { value: 1 })),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => parameters.delete(parameterId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => parameters.deleteSoft(parameterId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
