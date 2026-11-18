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
import { type PrivilegeCatalogRepository } from '@repository/interface/privilege-catalog'
import { REPOSITORY_PRIVILEGE_CATALOG } from '@repository/token'
import { PrivilegeCatalogRepositoryModule } from './privilege-catalog.module'
import { PrivilegeCatalogEntity } from './schema/privilege-catalog'

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
const itemId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: itemId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  facility_ids: [facilityId],
  code: 'PD-012',
  name: [{ locale: 'en', text: 'Central line insertion' }],
  description: [],
  committee: { system: 'id.committee', code: 'komite_medik' },
  professions: [{ system: 'id.profession', code: 'dokter' }],
  specialties: [],
  min_clinical_level: { system: 'id.clinical-level', code: 'pk3' },
  required_evidence: [
    {
      type: { system: 'id.evidence-type', code: 'logbook' },
      description: [{ locale: 'en', text: '20 cases' }],
      mandatory: true,
    },
  ],
  external_codes: [{ system: 'icd9cm', code: '38.93' }],
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-02-01T00:00:00Z'),
  updated_at: new Date('2026-02-01T00:00:00Z'),
  deleted_at: null,
}

describe('PrivilegeCatalogRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: itemId }),
      })),
    ),
  }
  let catalog: PrivilegeCatalogRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    facility_ids: [],
    code: 'PD-020',
    name: [{ locale: 'en', text: 'Intubation' }],
    description: [],
    committee: { system: 'id.committee', code: 'komite_medik' },
    professions: [{ system: 'id.profession', code: 'dokter' }],
    specialties: [],
    min_clinical_level: null,
    required_evidence: [],
    external_codes: [],
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
            _id: itemId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PrivilegeCatalogRepositoryModule],
    })
      .overrideProvider(
        getModelToken(PrivilegeCatalogEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    catalog = moduleRef.get(REPOSITORY_PRIVILEGE_CATALOG)
  })

  it('maps a stored item to the model without storage fields', async () => {
    const item = await catalog.findOne(itemId.toHexString())

    expect(item).toMatchObject({
      id: itemId.toHexString(),
      facility_ids: [facilityId.toHexString()],
      code: 'PD-012',
      committee: { code: 'komite_medik' },
      professions: [{ code: 'dokter' }],
      min_clinical_level: { code: 'pk3' },
      required_evidence: [
        { type: { code: 'logbook' }, description: [{ text: '20 cases' }], mandatory: true },
      ],
      external_codes: [{ code: '38.93' }],
      status: 'active',
    })
    expect(JSON.stringify(item)).not.toContain('"_id"')
    expect(JSON.stringify(item)).not.toContain('__v')
  })

  it('maps an item with no level', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, min_clinical_level: null }))

    expect(await catalog.findOne(itemId.toHexString())).toMatchObject({
      min_clinical_level: null,
    })
  })

  it('stamps a created item with the actor and records one change entry', async () => {
    await asAdmin(() => catalog.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'privilege_catalog_item' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(catalog.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(asAdmin(() => catalog.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('finds by code and lists with the filters, and answers null or empty for malformed ids', async () => {
    const tenant = tenantId.toHexString()

    expect(await catalog.findByCode(tenant, 'PD-012')).not.toBeNull()
    await catalog.findByFilter(tenant, {
      committee: 'komite_medik',
      profession: 'dokter',
      status: 'active',
      facilityId: facilityId.toHexString(),
      limit: 5,
      offset: 5,
    })

    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PD-012', deleted_at: null }),
    )
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        'committee.code': 'komite_medik',
        'professions.code': 'dokter',
        status: 'active',
        $or: [
          { facility_ids: { $size: 0 } },
          { facility_ids: facilityId.toHexString() },
        ],
      }),
    )
    expect(await catalog.findByCode('x', 'PD-012')).toBeNull()
    expect(await catalog.findByFilter('x')).toEqual([])
    expect(await catalog.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(model.find).toHaveBeenCalledTimes(1)
  })

  it('updates the editable fields and the status, never the code, the committee or the tenant', async () => {
    await asAdmin(() =>
      catalog.update(itemId.toHexString(), {
        status: 'retired',
        name: [{ locale: 'en', text: 'New name' }],
        professions: [{ system: 'id.profession', code: 'perawat' }],
        code: 'CHANGED',
        committee: { system: 'id.committee', code: 'other' },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'name', 'professions']),
    )
    for (const forbidden of ['code', 'committee']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => catalog.delete(itemId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
