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
import { type HrImportRepository } from '@repository/interface/hr-import'
import { REPOSITORY_HR_IMPORT } from '@repository/token'
import { HrImportRepositoryModule } from './hr-import.module'
import { HrImportEntity } from './schema/hr-import'

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
        : key.endsWith('_ids') && Array.isArray(value)
          ? value.map((item) => new Types.ObjectId(item as string))
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
const importId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: importId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  kind: 'holiday_calendar',
  target: { calendar_code: 'id-national', year: 2027 },
  file: { file_id: 'inline:abc', content_type: 'text/csv', sha256: 'a'.repeat(64) },
  status: 'validated',
  counts: { rows: 3, valid: 3, invalid: 0, created: 2, updated: 1, skipped: 0 },
  errors: [{ row: 2, column: 'date', code: 'invalid_date' }],
  uploaded: { by: actor, at: new Date('2026-03-01T00:00:00Z') },
  applied: null,
  failure: null,
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('HrImportRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: importId }),
      })),
    ),
  }
  let imports: HrImportRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    kind: 'holiday_calendar' as const,
    target: { calendar_code: 'id-national', year: 2027 },
    file: { file_id: 'inline:abc', content_type: 'text/csv', sha256: 'a'.repeat(64) },
    status: 'validated' as const,
    counts: { rows: 3, valid: 3, invalid: 0, created: 2, updated: 1, skipped: 0 },
    errors: [],
    uploaded: { by: actor as never, at: new Date('2026-03-01T00:00:00Z') },
    applied: null,
    failure: null,
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
          toObject: () => ({ ...stored, ...castIds(document), _id: importId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, HrImportRepositoryModule],
    })
      .overrideProvider(getModelToken(HrImportEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    imports = moduleRef.get(REPOSITORY_HR_IMPORT)
  })

  it('maps a stored import to the model without storage fields', async () => {
    const found = await imports.findOne(importId.toHexString())

    expect(found).toMatchObject({
      id: importId.toHexString(),
      tenant_id: tenantId.toHexString(),
      kind: 'holiday_calendar',
      target: { calendar_code: 'id-national', year: 2027 },
      file: { file_id: 'inline:abc', content_type: 'text/csv', sha256: 'a'.repeat(64) },
      status: 'validated',
      counts: { rows: 3, valid: 3, invalid: 0, created: 2, updated: 1, skipped: 0 },
      errors: [{ row: 2, column: 'date', code: 'invalid_date' }],
      applied: null,
      failure: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a roster target and an applied import with its failure', async () => {
    const rosterId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        kind: 'roster_assignments',
        target: { roster_id: rosterId },
        applied: { by: actor, at: new Date('2026-03-02T00:00:00Z') },
        failure: { error: 'RepositoryUnavailableError', retryable: true },
        errors: [{ row: 1, code: 'x' }],
      }),
    )
    const found = await imports.findOne(importId.toHexString())
    expect(found?.target).toEqual({ roster_id: rosterId.toHexString() })
    expect(found?.applied).toMatchObject({ at: new Date('2026-03-02T00:00:00Z') })
    expect(found?.failure).toEqual({ error: 'RepositoryUnavailableError', retryable: true })
    expect(found?.errors[0]).toEqual({ row: 1, column: null, code: 'x' })
  })

  it('lists with its filters, latest first, and answers an empty list for a malformed tenant', async () => {
    const tenant = tenantId.toHexString()
    await imports.findByFilter(tenant, {
      kind: 'holiday_calendar',
      calendarCode: 'id-national',
      year: 2027,
      status: 'applied',
      sha256: 'a'.repeat(64),
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        kind: 'holiday_calendar',
        status: 'applied',
        'target.calendar_code': 'id-national',
        'target.year': 2027,
        'file.sha256': 'a'.repeat(64),
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await imports.findByFilter('x')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await imports.findByFilter(tenant)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('status')
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('target.year')
  })

  it('stamps a created import with the actor and records one change entry', async () => {
    await asAdmin(() => imports.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'hr_import' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(imports.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('updates only the progress fields, never the kind, the target or the file', async () => {
    await asAdmin(() =>
      imports.update(importId.toHexString(), {
        status: 'applied',
        counts: input.counts,
        errors: [],
        applied: { by: actor as never, at: new Date() },
        failure: null,
        kind: 'roster_assignments',
        target: { roster_id: new Types.ObjectId().toHexString() },
        file: { file_id: 'x', content_type: 'text/csv', sha256: 'b'.repeat(64) },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['status', 'counts', 'errors', 'applied', 'failure']))
    for (const forbidden of ['kind', 'target', 'file']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => imports.delete(importId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
