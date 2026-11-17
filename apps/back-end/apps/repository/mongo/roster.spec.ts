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
import { type RosterRepository } from '@repository/interface/roster'
import { REPOSITORY_ROSTER } from '@repository/token'
import { RosterRepositoryModule } from './roster.module'
import { RosterEntity } from './schema/roster'

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
const unitId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const rosterId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: rosterId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  unit_id: unitId,
  facility_id: facilityId,
  period: { start: '2027-03-01', end: '2027-03-31' },
  status: 'approved',
  revision: 0,
  prepared_by: actor,
  submitted: { by: actor, at: new Date('2027-02-01T00:00:00Z') },
  approved: { by: { account_id: 'a2', display_name: 'Boss', kind: 'account' }, at: new Date('2027-02-02T00:00:00Z') },
  published: null,
  closed: null,
  return_reason: null,
  coverage_overrides: [],
  validation: null,
  created_by: actor,
  created_at: new Date('2027-01-01T00:00:00Z'),
  updated_at: new Date('2027-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('RosterRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: rosterId }),
      })),
    ),
  }
  let rosters: RosterRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    unit_id: unitId.toHexString(),
    facility_id: facilityId.toHexString(),
    period: { start: '2027-03-01', end: '2027-03-31' },
    status: 'draft' as const,
    revision: 0,
    prepared_by: actor as never,
    submitted: null,
    approved: null,
    published: null,
    closed: null,
    return_reason: null,
    coverage_overrides: [],
    validation: null,
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
          toObject: () => ({ ...stored, ...castIds(document), _id: rosterId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, RosterRepositoryModule],
    })
      .overrideProvider(getModelToken(RosterEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    rosters = moduleRef.get(REPOSITORY_ROSTER)
  })

  it('maps a stored roster to the model without storage fields', async () => {
    const found = await rosters.findOne(rosterId.toHexString())

    expect(found).toMatchObject({
      id: rosterId.toHexString(),
      tenant_id: tenantId.toHexString(),
      unit_id: unitId.toHexString(),
      facility_id: facilityId.toHexString(),
      period: { start: '2027-03-01', end: '2027-03-31' },
      status: 'approved',
      revision: 0,
      prepared_by: { account_id: 'a1' },
      submitted: { by: { account_id: 'a1' }, at: new Date('2027-02-01T00:00:00Z') },
      approved: { by: { account_id: 'a2' } },
      published: null,
      closed: null,
      return_reason: null,
      coverage_overrides: [],
      validation: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps coverage overrides and the validation summary', async () => {
    const shiftId = new Types.ObjectId()
    const requirementId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        return_reason: 'Perbaiki',
        coverage_overrides: [{ date: '2027-03-05', shift_definition_id: shiftId, requirement_id: requirementId, reason: 'Cuti', by: actor, at: new Date('2027-02-10T00:00:00Z') }],
        validation: { checked_at: new Date('2027-02-11T00:00:00Z'), violations: 1, coverage_gaps: 2 },
      }),
    )
    const found = await rosters.findOne(rosterId.toHexString())
    expect(found?.return_reason).toBe('Perbaiki')
    expect(found?.coverage_overrides[0]).toMatchObject({ date: '2027-03-05', shift_definition_id: shiftId.toHexString(), requirement_id: requirementId.toHexString(), reason: 'Cuti' })
    expect(found?.validation).toEqual({ checked_at: new Date('2027-02-11T00:00:00Z'), violations: 1, coverage_gaps: 2 })
  })

  it('lists with its filters, the period range included, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await rosters.findByFilter(tenant, {
      unitId: unitId.toHexString(),
      facilityId: facilityId.toHexString(),
      status: 'published',
      from: '2027-03-10',
      to: '2027-03-20',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        unit_id: unitId.toHexString(),
        facility_id: facilityId.toHexString(),
        status: 'published',
        'period.start': { $lte: '2027-03-20' },
        'period.end': { $gte: '2027-03-10' },
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await rosters.findByFilter('x')).toEqual([])
    expect(await rosters.findByFilter(tenant, { unitId: 'bad' })).toEqual([])
    expect(await rosters.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await rosters.findByFilter(tenant)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('period.start')
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('status')
  })

  it('lists only the rosters that are not closed when asked', async () => {
    await rosters.findByFilter(tenantId.toHexString(), { open: true })
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: { $in: ['draft', 'submitted', 'approved', 'published'] } }),
    )
  })

  it('finds a roster by unit and start, and the rosters that overlap a range', async () => {
    const tenant = tenantId.toHexString()
    expect(await rosters.findByUnitAndStart(tenant, unitId.toHexString(), '2027-03-01')).toMatchObject({ status: 'approved' })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, unit_id: unitId.toHexString(), 'period.start': '2027-03-01', deleted_at: null }),
    )
    await rosters.findOverlapping(tenant, unitId.toHexString(), '2027-03-15', '2027-04-15')
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ unit_id: unitId.toHexString(), 'period.start': { $lte: '2027-04-15' }, 'period.end': { $gte: '2027-03-15' } }),
    )
    model.findOne.mockClear()
    model.find.mockClear()
    expect(await rosters.findByUnitAndStart('x', unitId.toHexString(), '2027-03-01')).toBeNull()
    expect(await rosters.findByUnitAndStart(tenant, 'bad', '2027-03-01')).toBeNull()
    expect(await rosters.findOverlapping(tenant, 'bad', '2027-03-01', '2027-03-31')).toEqual([])
    expect(model.findOne).not.toHaveBeenCalled()
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created roster with the actor and records one change entry', async () => {
    await asAdmin(() => rosters.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'roster' } })
  })

  it('refuses to write without an acting account, and translates a duplicate key into a conflict', async () => {
    await expect(rosters.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )
    await expect(asAdmin(() => rosters.create(input))).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('updates only the lifecycle fields, never the unit, the facility, the period or the preparer', async () => {
    await asAdmin(() =>
      rosters.update(rosterId.toHexString(), {
        status: 'published',
        revision: 1,
        submitted: null,
        approved: null,
        published: { by: actor as never, at: new Date() },
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: { checked_at: new Date(), violations: 0, coverage_gaps: 0 },
        unit_id: new Types.ObjectId().toHexString(),
        facility_id: new Types.ObjectId().toHexString(),
        period: { start: '2028-01-01', end: '2028-01-31' },
        prepared_by: { account_id: 'x', display_name: 'X', kind: 'account' },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'revision', 'submitted', 'approved', 'published', 'closed', 'return_reason', 'coverage_overrides', 'validation']),
    )
    for (const forbidden of ['unit_id', 'facility_id', 'period', 'prepared_by']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => rosters.delete(rosterId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
