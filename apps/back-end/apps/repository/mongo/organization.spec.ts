import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { Types } from 'mongoose'
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
import { type OrganizationRepository } from '@repository/interface/organization'
import { REPOSITORY_ORGANIZATION } from '@repository/token'
import { OrganizationRepositoryModule } from './organization.module'
import { OrganizationEntity } from './schema/organization'

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

const tenantId = new Types.ObjectId()
const organizationId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: organizationId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  code: 'rs-sehat',
  legal_name: 'PT Rumah Sakit Sehat',
  country: 'ID',
  identifiers: [{ system: 'id.npwp-badan', value: '01.234.567.8-901.000' }],
  currency: 'IDR',
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('OrganizationRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn(() => query(stored)),
    findOneAndUpdate: vi.fn(() => query({ ...stored, version: 3 })),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({
          ...stored,
          ...castIds(document),
          _id: organizationId,
        }),
      })),
    ),
  }
  let organizations: OrganizationRepository

  beforeEach(async () => {
    appended.length = 0
    vi.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, OrganizationRepositoryModule],
    })
      .overrideProvider(
        getModelToken(OrganizationEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    organizations = moduleRef.get(REPOSITORY_ORGANIZATION)
  })

  it('maps a stored organization to the model without storage fields', async () => {
    const organization = await organizations.findOne(
      organizationId.toHexString(),
    )

    expect(organization).toMatchObject({
      id: organizationId.toHexString(),
      tenant_id: tenantId.toHexString(),
      code: 'rs-sehat',
      version: 2,
    })
    expect(JSON.stringify(organization)).not.toContain('"_id"')
    expect(JSON.stringify(organization)).not.toContain('__v')
  })

  it('finds an organization by tenant and code, and ignores a malformed tenant id', async () => {
    const found = await organizations.findByCode(
      tenantId.toHexString(),
      'rs-sehat',
    )

    expect(found?.legal_name).toBe('PT Rumah Sakit Sehat')
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'rs-sehat', deleted_at: null }),
    )
    expect(await organizations.findByCode('not-an-id', 'rs-sehat')).toBeNull()
  })

  it('refuses to write without an acting account', async () => {
    await expect(
      organizations.create({
        tenant_id: tenantId.toHexString(),
        code: 'x1',
        legal_name: 'X',
        country: 'ID',
        identifiers: [],
        currency: 'IDR',
        status: 'active',
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('stamps a created organization with the actor and records one change entry', async () => {
    await asAdmin(() =>
      organizations.create({
        tenant_id: tenantId.toHexString(),
        code: 'rs-baru',
        legal_name: 'PT Baru',
        country: 'ID',
        identifiers: [],
        currency: 'IDR',
        status: 'active',
      }),
    )

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'organization' },
    })
  })

  it('updates only legal name, currency, identifiers and status; code and country are ignored', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(
      query({ ...stored, version: 3, legal_name: 'PT Rumah Sakit Sehat Tbk' }),
    )
    await asAdmin(() =>
      organizations.update(organizationId.toHexString(), {
        legal_name: 'PT Rumah Sakit Sehat Tbk',
        code: 'hacked',
        country: 'SG',
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('legal_name', 'PT Rumah Sakit Sehat Tbk')
    expect(update.$set).not.toHaveProperty('code')
    expect(update.$set).not.toHaveProperty('country')
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'update' })
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(query(null))

    await expect(
      asAdmin(() =>
        organizations.update(
          organizationId.toHexString(),
          { legal_name: 'Y' },
          { expectedVersion: 1 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => organizations.delete(organizationId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => organizations.deleteSoft(organizationId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
