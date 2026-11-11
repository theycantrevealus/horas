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
import { type CodeConceptRepository } from '@repository/interface/code-concept'
import { REPOSITORY_CODE_CONCEPT } from '@repository/token'
import { CodeConceptRepositoryModule } from './code-concept.module'
import { CodeConceptEntity } from './schema/code-concept'

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
  const result = {
    lean: () => ({ exec: async () => value }),
    exec: async () => value,
    sort: () => result,
  }
  return result
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
const conceptId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: conceptId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  system: 'id.license-type',
  code: 'sip',
  display: [{ locale: 'id-ID', text: 'Surat Izin Praktik' }],
  properties: {
    eligibility_role: 'practice_permit',
    requires_expiry_date: true,
  },
  mappings: [{ system: 'license-type', code: 'practice_permit' }],
  period: { start: '2024-01-01', end: null },
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}
const { tenant_id: _tenant, ...platformStored } = stored

describe('CodeConceptRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn(() => query(stored)),
    find: vi.fn(() => query([stored, platformStored])),
    findOneAndUpdate: vi.fn(() => query({ ...stored, version: 3 })),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: conceptId }),
      })),
    ),
  }
  let concepts: CodeConceptRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    system: 'id.unit-type',
    code: 'ward',
    display: [{ locale: 'en', text: 'Ward' }],
    properties: {},
    mappings: [],
    period: null,
    status: 'active' as const,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CodeConceptRepositoryModule],
    })
      .overrideProvider(
        getModelToken(CodeConceptEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    concepts = moduleRef.get(REPOSITORY_CODE_CONCEPT)
  })

  it('maps a stored tenant concept to the model without storage fields', async () => {
    const concept = await concepts.findOwn(
      tenantId.toHexString(),
      'id.license-type',
      'sip',
    )

    expect(concept).toMatchObject({
      id: conceptId.toHexString(),
      tenant_id: tenantId.toHexString(),
      system: 'id.license-type',
      code: 'sip',
      properties: {
        eligibility_role: 'practice_permit',
        requires_expiry_date: true,
      },
      mappings: [{ system: 'license-type', code: 'practice_permit' }],
      period: { start: '2024-01-01', end: null },
    })
    expect(JSON.stringify(concept)).not.toContain('"_id"')
    expect(JSON.stringify(concept)).not.toContain('__v')
  })

  it('maps a platform-wide concept without a tenant', async () => {
    model.find.mockReturnValueOnce(query([platformStored]))

    const [concept] = await concepts.findBySystem(
      tenantId.toHexString(),
      'id.license-type',
    )

    expect(concept).not.toHaveProperty('tenant_id')
    expect(concept.code).toBe('sip')
  })

  it('returns the tenant concept for a code before looking for a platform one', async () => {
    const concept = await concepts.findByCode(
      tenantId.toHexString(),
      'id.license-type',
      'sip',
    )

    expect(concept?.tenant_id).toBe(tenantId.toHexString())
    expect(model.findOne).toHaveBeenCalledTimes(1)
  })

  it('falls back to the platform concept when the tenant has none', async () => {
    model.findOne
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(platformStored))

    const concept = await concepts.findByCode(
      tenantId.toHexString(),
      'id.license-type',
      'sip',
    )

    expect(concept).not.toHaveProperty('tenant_id')
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tenant_id: null,
        system: 'id.license-type',
        code: 'sip',
        deleted_at: null,
      }),
    )
  })

  it('returns null when neither exists, and ignores a malformed tenant id', async () => {
    model.findOne.mockReturnValue(query(null))

    expect(
      await concepts.findByCode(tenantId.toHexString(), 'id.x', 'y'),
    ).toBeNull()
    expect(await concepts.findOwn('not-an-id', 'id.x', 'y')).toBeNull()
    expect(await concepts.findBySystem('not-an-id', 'id.x')).toEqual([])
    model.findOne.mockReset()
  })

  it('finds the tenant and platform concepts of a system, ordered by code', async () => {
    const found = await concepts.findBySystem(
      tenantId.toHexString(),
      'id.license-type',
    )

    expect(found).toHaveLength(2)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'id.license-type',
        tenant_id: { $in: [tenantId.toHexString(), null] },
        deleted_at: null,
      }),
    )
  })

  it('refuses to write without an acting account', async () => {
    await expect(concepts.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('stamps a created concept with the actor and records one change entry', async () => {
    await asAdmin(() => concepts.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'code_concept' },
    })
  })

  it('updates only display, properties, mappings, period and status', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(
      query({ ...stored, version: 3, status: 'retired' }),
    )

    await asAdmin(() =>
      concepts.update(conceptId.toHexString(), {
        status: 'retired',
        system: 'hacked.system',
        code: 'hacked',
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('status', 'retired')
    expect(update.$set).not.toHaveProperty('system')
    expect(update.$set).not.toHaveProperty('code')
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'update' })
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(query(null))

    await expect(
      asAdmin(() =>
        concepts.update(
          conceptId.toHexString(),
          { status: 'retired' },
          { expectedVersion: 1 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => concepts.delete(conceptId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => concepts.deleteSoft(conceptId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
