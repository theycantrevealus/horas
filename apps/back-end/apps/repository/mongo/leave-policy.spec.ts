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
import { type LeavePolicyRepository } from '@repository/interface/leave-policy'
import { REPOSITORY_LEAVE_POLICY } from '@repository/token'
import { LeavePolicyRepositoryModule } from './leave-policy.module'
import { LeavePolicyEntity, LeavePolicySchema } from './schema/leave-policy'

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
const policyId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const annual = { system: 'id.leave-type', code: 'tahunan' }
const stored = {
  _id: policyId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  leave_type: annual,
  effective_from: '2027-01-01',
  balance: {
    kind: 'period',
    period: 'service_year',
    days: 12,
    min_service_months: 12,
    carry_over: null,
    deduct_collective_leave: false,
  },
  counting: 'working_days',
  half_days: true,
  paid: true,
  employment_types: [{ system: 'id.employment-type', code: 'pkwtt' }],
  approval: { steps: 'one_step', two_step_above_days: null },
  notice_days: 0,
  retroactive_days: 0,
  max_days_per_request: 12,
  proof: null,
  notes: null,
  source: { kind: 'bundle', bundle_id: 'id' },
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('LeavePolicyRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: policyId }),
      })),
    ),
  }
  let policies: LeavePolicyRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    leave_type: annual,
    effective_from: '2027-01-01',
    balance: stored.balance as never,
    counting: 'working_days' as const,
    half_days: true,
    paid: true,
    employment_types: [],
    approval: { steps: 'one_step' as const, two_step_above_days: null },
    notice_days: 0,
    retroactive_days: 0,
    max_days_per_request: 12,
    proof: null,
    notes: null,
    source: { kind: 'manual' as const, bundle_id: null },
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
          toObject: () => ({ ...stored, ...castIds(document), _id: policyId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, LeavePolicyRepositoryModule],
    })
      .overrideProvider(
        getModelToken(LeavePolicyEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    policies = moduleRef.get(REPOSITORY_LEAVE_POLICY)
  })

  it('pins the collection name leave_policies', () => {
    expect(LeavePolicySchema.get('collection')).toBe('leave_policies')
  })

  it('declares the unique index on tenant, leave type and effective_from', () => {
    expect(LeavePolicySchema.indexes()).toContainEqual([
      {
        tenant_id: 1,
        'leave_type.system': 1,
        'leave_type.code': 1,
        effective_from: 1,
      },
      expect.objectContaining({ unique: true }),
    ])
  })

  it('maps a stored policy to the model without storage fields', async () => {
    const found = await policies.findOne(policyId.toHexString())

    expect(found).toMatchObject({
      id: policyId.toHexString(),
      tenant_id: tenantId.toHexString(),
      leave_type: annual,
      effective_from: '2027-01-01',
      balance: { kind: 'period', period: 'service_year', days: 12 },
      counting: 'working_days',
      employment_types: [{ system: 'id.employment-type', code: 'pkwtt' }],
      approval: { steps: 'one_step', two_step_above_days: null },
      proof: null,
      source: { kind: 'bundle', bundle_id: 'id' },
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('findInForce asks for the latest version on or before the date and answers null when there is none', async () => {
    const tenant = tenantId.toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    const found = await policies.findInForce(tenant, annual, '2027-06-30')

    expect(found?.effective_from).toBe('2027-01-01')
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        'leave_type.system': 'id.leave-type',
        'leave_type.code': 'tahunan',
        effective_from: { $lte: '2027-06-30' },
        deleted_at: null,
      }),
    )
    expect(query.sort).toHaveBeenCalledWith({ effective_from: -1 })
    expect(query.limit).toHaveBeenCalledWith(1)

    model.find.mockReturnValueOnce(chain([]))
    expect(await policies.findInForce(tenant, annual, '2026-12-31')).toBeNull()

    model.find.mockClear()
    expect(await policies.findInForce('x', annual, '2027-06-30')).toBeNull()
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the version of a type that starts on a date', async () => {
    const tenant = tenantId.toHexString()
    expect(
      await policies.findByTypeAndDate(tenant, annual, '2027-01-01'),
    ).toMatchObject({ effective_from: '2027-01-01' })
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        'leave_type.code': 'tahunan',
        effective_from: '2027-01-01',
      }),
    )
  })

  it('lists with its filters and answers an empty list for a malformed tenant', async () => {
    const tenant = tenantId.toHexString()
    await policies.findByFilter(tenant, {
      leaveTypeSystem: 'id.leave-type',
      leaveTypeCode: 'tahunan',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        'leave_type.system': 'id.leave-type',
        'leave_type.code': 'tahunan',
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await policies.findByFilter('x')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created policy with the actor and records one change entry of type leave_policy', async () => {
    await asAdmin(() => policies.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({
        created_by: expect.objectContaining({ account_id: 'a1' }),
        schema_version: 1,
      }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'leave_policy' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(policies.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('never changes the leave type, the effective date or the source on update', async () => {
    await asAdmin(() =>
      policies.update(policyId.toHexString(), {
        counting: 'calendar_days',
        half_days: false,
        paid: false,
        max_days_per_request: 14,
        notes: 'PKB art. 12',
        leave_type: { system: 'id.leave-type', code: 'sakit' },
        effective_from: '2030-01-01',
        source: { kind: 'manual', bundle_id: null },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['counting', 'half_days', 'paid', 'notes']),
    )
    for (const forbidden of ['leave_type', 'effective_from', 'source']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => policies.delete(policyId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
