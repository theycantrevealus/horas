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
import { type LeaveLedgerRepository } from '@repository/interface/leave-ledger'
import { REPOSITORY_LEAVE_LEDGER } from '@repository/token'
import { LeaveLedgerRepositoryModule } from './leave-ledger.module'
import {
  LeaveLedgerEntryEntity,
  LeaveLedgerEntrySchema,
} from './schema/leave-ledger'

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
    sort: vi.fn(() => self),
    skip: () => self,
    limit: vi.fn(() => self),
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const entryId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const annual = { system: 'id.leave-type', code: 'tahunan' }
const stored = {
  _id: entryId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  employee_id: employeeId,
  leave_type: annual,
  period: { start: '2027-01-01', end: '2027-12-31' },
  kind: 'grant',
  days: 12,
  bucket: 'own',
  expires_on: null,
  source: { kind: 'job', ref_id: null, date: null },
  dedupe_key: 'e1:tahunan:grant:2027-01-01',
  created_by: actor,
  created_at: new Date('2026-12-01T00:00:00Z'),
  updated_at: new Date('2026-12-01T00:00:00Z'),
  deleted_at: null,
}

describe('LeaveLedgerRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: entryId }),
      })),
    ),
  }
  let ledger: LeaveLedgerRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    leave_type: annual,
    period: { start: '2027-01-01', end: '2027-12-31' },
    kind: 'grant' as const,
    days: 12,
    bucket: 'own' as const,
    expires_on: null,
    source: { kind: 'job' as const, ref_id: null, date: null },
    dedupe_key: 'e1:tahunan:grant:2027-01-01',
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
          toObject: () => ({ ...stored, ...castIds(document), _id: entryId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, LeaveLedgerRepositoryModule],
    })
      .overrideProvider(
        getModelToken(LeaveLedgerEntryEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    ledger = moduleRef.get(REPOSITORY_LEAVE_LEDGER)
  })

  it('pins the collection name leave_ledger_entries', () => {
    expect(LeaveLedgerEntrySchema.get('collection')).toBe('leave_ledger_entries')
  })

  it('declares the balance index and the unique dedupe key that only applies when a key is set', () => {
    const indexes = LeaveLedgerEntrySchema.indexes()

    expect(indexes).toContainEqual([
      {
        tenant_id: 1,
        employee_id: 1,
        'leave_type.code': 1,
        'period.start': 1,
      },
      expect.anything(),
    ])
    expect(indexes).toContainEqual([
      { tenant_id: 1, dedupe_key: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { dedupe_key: { $type: 'string' } },
      }),
    ])
  })

  it('maps a stored entry to the model without storage fields', async () => {
    const found = await ledger.findOne(entryId.toHexString())

    expect(found).toMatchObject({
      id: entryId.toHexString(),
      tenant_id: tenantId.toHexString(),
      employee_id: employeeId.toHexString(),
      leave_type: annual,
      period: { start: '2027-01-01', end: '2027-12-31' },
      kind: 'grant',
      days: 12,
      bucket: 'own',
      expires_on: null,
      source: { kind: 'job', ref_id: null, date: null },
      dedupe_key: 'e1:tahunan:grant:2027-01-01',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps the reference of a request entry to a hex string', async () => {
    const requestId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        kind: 'use',
        days: -3,
        dedupe_key: null,
        source: { kind: 'request', ref_id: requestId, date: null },
      }),
    )

    expect(await ledger.findOne(entryId.toHexString())).toMatchObject({
      kind: 'use',
      days: -3,
      dedupe_key: null,
      source: { kind: 'request', ref_id: requestId.toHexString(), date: null },
    })
  })

  it('appends an entry, stamps the actor and records one change entry of type leave_ledger_entry', async () => {
    await asAdmin(() => ledger.append(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({
        created_by: expect.objectContaining({ account_id: 'a1' }),
        schema_version: 1,
        dedupe_key: 'e1:tahunan:grant:2027-01-01',
      }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'leave_ledger_entry' },
    })
  })

  it('rejects with RepositoryConflictError when the dedupe key is already used', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )

    await expect(asAdmin(() => ledger.append(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('refuses to write without an acting account', async () => {
    await expect(ledger.append(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('has no update, delete or soft delete: entries are never edited or removed', async () => {
    const id = entryId.toHexString()

    await expect(asAdmin(() => ledger.update(id, { days: 1 }))).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => ledger.delete(id))).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => ledger.deleteSoft(id))).rejects.toBeInstanceOf(RepositoryError)
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('lists an employee\'s entries with the filters, oldest first, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const employee = employeeId.toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    await ledger.findByEmployee(tenant, employee, {
      leaveTypeSystem: 'id.leave-type',
      leaveTypeCode: 'tahunan',
      periodStart: '2027-01-01',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employee,
        'leave_type.system': 'id.leave-type',
        'leave_type.code': 'tahunan',
        'period.start': '2027-01-01',
        deleted_at: null,
      }),
    )
    expect(query.sort).toHaveBeenCalledWith({ created_at: 1, _id: 1 })
    model.find.mockClear()
    expect(await ledger.findByEmployee('x', employee)).toEqual([])
    expect(await ledger.findByEmployee(tenant, 'bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds every entry of one employee, leave type and entitlement period, without paging', async () => {
    const tenant = tenantId.toHexString()
    const employee = employeeId.toHexString()
    const query = chain([stored, stored])
    model.find.mockReturnValueOnce(query)

    const found = await ledger.findByEmployeeTypeAndPeriod(tenant, employee, annual, '2027-01-01')

    expect(found).toHaveLength(2)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employee,
        'leave_type.system': 'id.leave-type',
        'leave_type.code': 'tahunan',
        'period.start': '2027-01-01',
      }),
    )
    expect(query.limit).not.toHaveBeenCalled()
    model.find.mockClear()
    expect(await ledger.findByEmployeeTypeAndPeriod('x', employee, annual, '2027-01-01')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the entries a request posted, and nothing for a malformed identifier', async () => {
    const tenant = tenantId.toHexString()
    const request = new Types.ObjectId().toHexString()
    model.find.mockReturnValueOnce(chain([stored]))

    expect(await ledger.findByRequest(tenant, request)).toHaveLength(1)

    expect(model.find).toHaveBeenCalledWith({
      tenant_id: tenant,
      'source.kind': 'request',
      'source.ref_id': request,
      deleted_at: null,
    })
    model.find.mockClear()
    expect(await ledger.findByRequest(tenant, 'bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    expect(LeaveLedgerEntrySchema.indexes()).toContainEqual([
      { tenant_id: 1, 'source.ref_id': 1 },
      expect.objectContaining({ partialFilterExpression: { 'source.kind': 'request' } }),
    ])
  })

  it('reads the grants of every tenant whose period ended in a window, after a cursor, for the jobs', async () => {
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    const found = await ledger.findGrantsEndedBetween('2026-11-12', '2026-11-18', entryId.toHexString(), 25)

    expect(found).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith({
      kind: 'grant',
      'period.end': { $gte: '2026-11-12', $lte: '2026-11-18' },
      deleted_at: null,
      _id: { $gt: entryId },
    })
    expect(query.sort).toHaveBeenCalledWith({ _id: 1 })
    expect(query.limit).toHaveBeenCalledWith(25)
    model.find.mockClear()
    expect(await ledger.findGrantsEndedBetween('2026-11-12', '2026-11-18', 'bad', 25)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await ledger.findGrantsEndedBetween('2026-11-12', '2026-11-18', null, 25)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('_id')
  })

  it('reads the carry-over entries of every tenant that expire in a window, after a cursor, for the jobs', async () => {
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    await ledger.findCarryOversExpiringBetween('2026-11-12', '2026-11-18', null, 10)

    expect(model.find).toHaveBeenCalledWith({
      kind: 'carry_over',
      expires_on: { $gte: '2026-11-12', $lte: '2026-11-18' },
      deleted_at: null,
    })
    expect(query.sort).toHaveBeenCalledWith({ _id: 1 })
    expect(await ledger.findCarryOversExpiringBetween('2026-11-12', '2026-11-18', 'bad', 10)).toEqual([])
  })
})
