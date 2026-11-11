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
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { REPOSITORY_ORGANIZATION_UNIT } from '@repository/token'
import { OrganizationUnitRepositoryModule } from './organization-unit.module'
import { OrganizationUnitEntity } from './schema/organization-unit'

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
const facilityId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }

/**
 * Builds a stored unit.
 *
 * @param id - Identifier.
 * @param code - Unit code.
 * @param ancestors - Ancestor identifiers, top first.
 * @returns The stored record.
 */
function stored(id: Types.ObjectId, code: string, ancestors: Types.ObjectId[]) {
  return {
    _id: id,
    tenant_id: tenantId,
    schema_version: 1,
    version: 1,
    organization_id: new Types.ObjectId(),
    facility_id: facilityId,
    code,
    name: [{ locale: 'en', text: code }],
    type: { system: 'id.unit-type', code: 'ward' },
    parent_id: ancestors.at(-1) ?? null,
    ancestor_ids: ancestors,
    is_clinical: true,
    external_ids: [{ system: 'satusehat', value: 'x' }],
    period: { start: '2026-01-01', end: null },
    status: 'active',
    created_by: actor,
    created_at: new Date('2026-01-01T00:00:00Z'),
    updated_at: new Date('2026-01-01T00:00:00Z'),
    deleted_at: null,
  }
}

const topId = new Types.ObjectId()
const midId = new Types.ObjectId()
const leafId = new Types.ObjectId()
const newParentId = new Types.ObjectId()
const newGrandId = new Types.ObjectId()
const mid = stored(midId, 'dept', [topId])
const leaf = stored(leafId, 'ward', [topId, midId])

describe('OrganizationUnitRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(mid)),
    find: vi.fn((..._args: unknown[]) => chain([mid])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(mid)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...mid, ...castIds(document), _id: midId }),
      })),
    ),
  }
  let units: OrganizationUnitRepository

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(mid))
    model.find.mockImplementation(() => chain([mid]))
    model.findOneAndUpdate.mockImplementation(() => chain(mid))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({ ...mid, ...castIds(document), _id: midId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, OrganizationUnitRepositoryModule],
    })
      .overrideProvider(
        getModelToken(OrganizationUnitEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    units = moduleRef.get(REPOSITORY_ORGANIZATION_UNIT)
  })

  it('maps a stored unit to the model without storage fields', async () => {
    const unit = await units.findOne(midId.toHexString())

    expect(unit).toMatchObject({
      id: midId.toHexString(),
      facility_id: facilityId.toHexString(),
      parent_id: topId.toHexString(),
      ancestor_ids: [topId.toHexString()],
      type: { system: 'id.unit-type', code: 'ward' },
      period: { start: '2026-01-01', end: null },
    })
    expect(JSON.stringify(unit)).not.toContain('"_id"')
    expect(JSON.stringify(unit)).not.toContain('__v')
  })

  it('stamps a created unit with the actor and records one change entry', async () => {
    await asAdmin(() =>
      units.create({
        tenant_id: tenantId.toHexString(),
        organization_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId.toHexString(),
        code: 'dept',
        name: [{ locale: 'en', text: 'Dept' }],
        type: { system: 'id.unit-type', code: 'department' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: false,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      }),
    )

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'organization_unit' },
    })
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(
      asAdmin(() =>
        units.create({
          tenant_id: tenantId.toHexString(),
          code: 'dept',
        } as never),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('finds by facility and code, and answers null or empty for malformed ids', async () => {
    const found = await units.findByCode(
      tenantId.toHexString(),
      facilityId.toHexString(),
      'dept',
    )

    expect(found?.code).toBe('dept')
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'dept', deleted_at: null }),
    )
    expect(
      await units.findByCode('x', facilityId.toHexString(), 'a'),
    ).toBeNull()
    expect(await units.findDescendants(tenantId.toHexString(), 'x')).toEqual([])
    expect(await units.findByFacility('x', 'y')).toEqual([])
  })

  it('finds descendants by their ancestor list and children by parent', async () => {
    await units.findDescendants(tenantId.toHexString(), topId.toHexString())
    await units.findChildren(tenantId.toHexString(), topId.toHexString())
    await units.findActiveByFacility(
      tenantId.toHexString(),
      facilityId.toHexString(),
      5,
    )

    expect(model.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        ancestor_ids: topId.toHexString(),
        deleted_at: null,
      }),
    )
    expect(model.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ parent_id: topId.toHexString() }),
    )
    expect(model.find).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ status: 'active', deleted_at: null }),
    )
  })

  it('updates only the editable fields, never code, facility or parent', async () => {
    await asAdmin(() =>
      units.update(midId.toHexString(), {
        status: 'closed',
        code: 'hacked',
        facility_id: new Types.ObjectId().toHexString(),
        parent_id: null,
        ancestor_ids: [],
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('status', 'closed')
    for (const forbidden of [
      'code',
      'facility_id',
      'parent_id',
      'ancestor_ids',
    ]) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('moves a unit and rewrites the ancestors of every unit below it, one change entry each', async () => {
    const newParent = stored(newParentId, 'other', [newGrandId])
    model.findOne
      .mockImplementationOnce(() => chain(mid))
      .mockImplementationOnce(() => chain(newParent))
    model.find.mockImplementationOnce(() => chain([leaf]))
    model.findOneAndUpdate
      .mockImplementationOnce(() =>
        chain({ ...mid, version: 2, parent_id: newParentId }),
      )
      .mockImplementationOnce(() =>
        chain({ ...leaf, version: 2, ancestor_ids: [newParentId, midId] }),
      )

    await asAdmin(() =>
      units.moveSubtree(midId.toHexString(), newParentId.toHexString(), {
        expectedVersion: 1,
      }),
    )

    const calls = model.findOneAndUpdate.mock.calls as unknown as [
      { version?: number },
      { $set: { parent_id?: Types.ObjectId; ancestor_ids: Types.ObjectId[] } },
    ][]
    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toMatchObject({ version: 1 })
    expect(calls[0][1].$set.parent_id).toEqual(newParentId)
    expect(calls[0][1].$set.ancestor_ids).toEqual([newGrandId, newParentId])
    expect(calls[1][1].$set).not.toHaveProperty('parent_id')
    expect(calls[1][1].$set.ancestor_ids).toEqual([
      newGrandId,
      newParentId,
      midId,
    ])
    expect(appended).toHaveLength(2)
  })

  it('moves a unit to the top with empty ancestors', async () => {
    model.find.mockImplementationOnce(() => chain([]))

    await asAdmin(() => units.moveSubtree(midId.toHexString(), null))

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toMatchObject({ parent_id: null, ancestor_ids: [] })
  })

  it('refuses a move under the unit itself or one of its descendants without writing', async () => {
    model.findOne
      .mockImplementationOnce(() => chain(mid))
      .mockImplementationOnce(() => chain(leaf))

    await expect(
      asAdmin(() =>
        units.moveSubtree(midId.toHexString(), leafId.toHexString()),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)

    model.findOne
      .mockImplementationOnce(() => chain(mid))
      .mockImplementationOnce(() => chain(mid))
    await expect(
      asAdmin(() =>
        units.moveSubtree(midId.toHexString(), midId.toHexString()),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)

    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
    expect(appended).toHaveLength(0)
  })

  it('refuses a move when the new parent is missing, closed or elsewhere', async () => {
    model.findOne
      .mockImplementationOnce(() => chain(mid))
      .mockImplementationOnce(() => chain(null))

    await expect(
      asAdmin(() =>
        units.moveSubtree(midId.toHexString(), newParentId.toHexString()),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('rejects a stale expected version before any write', async () => {
    await expect(
      asAdmin(() =>
        units.moveSubtree(midId.toHexString(), null, { expectedVersion: 9 }),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('aborts when a unit changes during the move, leaving no change entry for it', async () => {
    model.find.mockImplementationOnce(() => chain([leaf]))
    model.findOneAndUpdate
      .mockImplementationOnce(() =>
        chain({ ...mid, version: 2, parent_id: null, ancestor_ids: [] }),
      )
      .mockImplementationOnce(() => chain(null))

    await expect(
      asAdmin(() => units.moveSubtree(midId.toHexString(), null)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(1)
  })

  it('refuses a move without an acting account', async () => {
    await expect(
      units.moveSubtree(midId.toHexString(), null),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => units.delete(midId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => units.deleteSoft(midId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
