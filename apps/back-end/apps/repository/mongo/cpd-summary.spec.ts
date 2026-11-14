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
import { type CpdSummaryRepository } from '@repository/interface/cpd-summary'
import { REPOSITORY_CPD_SUMMARY } from '@repository/token'
import { CpdSummaryRepositoryModule } from './cpd-summary.module'
import { CpdSummaryEntity } from './schema/cpd-summary'

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
const employeeId = new Types.ObjectId()
const summaryId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: summaryId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  credit_system: { system: 'id.credit-system', code: 'skp' },
  profession: { system: 'id.profession', code: 'dokter' },
  cycle: { start: '2026-01-01', end: '2030-12-31' },
  total_points: 42.5,
  checked_at: new Date('2026-03-01T00:00:00Z'),
  source: 'external_platform',
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('CpdSummaryRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: summaryId }),
      })),
    ),
  }
  let summaries: CpdSummaryRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    credit_system: { system: 'id.credit-system', code: 'skp' },
    profession: { system: 'id.profession', code: 'dokter' },
    cycle: { start: '2026-01-01', end: '2030-12-31' },
    total_points: 10,
    checked_at: new Date('2026-03-01T00:00:00Z'),
    source: 'external_platform' as const,
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
            _id: summaryId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CpdSummaryRepositoryModule],
    })
      .overrideProvider(getModelToken(CpdSummaryEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    summaries = moduleRef.get(REPOSITORY_CPD_SUMMARY)
  })

  it('maps a stored summary to the model without storage fields', async () => {
    const summary = await summaries.findOne(summaryId.toHexString())

    expect(summary).toMatchObject({
      id: summaryId.toHexString(),
      employee_id: employeeId.toHexString(),
      credit_system: { code: 'skp' },
      profession: { code: 'dokter' },
      cycle: { start: '2026-01-01', end: '2030-12-31' },
      total_points: 42.5,
      source: 'external_platform',
    })
    expect(JSON.stringify(summary)).not.toContain('"_id"')
    expect(JSON.stringify(summary)).not.toContain('__v')
  })

  it('stamps a created summary with the actor and records one change entry', async () => {
    await asAdmin(() => summaries.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'cpd_summary' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(summaries.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(
      asAdmin(() => summaries.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('lists an employee’s summaries, finds one by credit system, and answers empty or null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const employee = employeeId.toHexString()

    expect(await summaries.findByEmployee(tenant, employee)).toHaveLength(1)
    expect(
      await summaries.findByEmployeeAndSystem(tenant, employee, 'id.credit-system', 'skp'),
    ).not.toBeNull()
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        'credit_system.system': 'id.credit-system',
        'credit_system.code': 'skp',
        deleted_at: null,
      }),
    )
    expect(await summaries.findByEmployee('x', 'y')).toEqual([])
    expect(await summaries.findByEmployeeAndSystem('x', 'y', 's', 'c')).toBeNull()
  })

  it('updates the total, the cycle, the profession and the date, never the employee or the credit system', async () => {
    await asAdmin(() =>
      summaries.update(summaryId.toHexString(), {
        total_points: 50,
        cycle: { start: '2027-01-01', end: '2031-12-31' },
        checked_at: new Date('2026-04-01T00:00:00Z'),
        employee_id: new Types.ObjectId().toHexString(),
        credit_system: { system: 'id.credit-system', code: 'other' },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['total_points', 'cycle', 'checked_at']),
    )
    for (const forbidden of ['employee_id', 'credit_system']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => summaries.delete(summaryId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
