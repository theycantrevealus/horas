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
import { type CoverageRequirementRepository } from '@repository/interface/coverage-requirement'
import { REPOSITORY_COVERAGE_REQUIREMENT } from '@repository/token'
import { CoverageRequirementRepositoryModule } from './coverage-requirement.module'
import { CoverageRequirementEntity } from './schema/coverage-requirement'

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
const shiftId = new Types.ObjectId()
const requirementId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: requirementId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  unit_id: unitId,
  shift_definition_id: shiftId,
  day_pattern: 'all',
  match: {
    workforce_category: null,
    profession: { system: 'id.profession', code: 'nurse' },
    specialty: null,
    min_clinical_level: { system: 'id.clinical-level', code: 'pk2' },
  },
  min_count: 3,
  team_leader_required: true,
  period: { start: '2027-01-01', end: null },
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('CoverageRequirementRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: requirementId }),
      })),
    ),
  }
  let requirements: CoverageRequirementRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    unit_id: unitId.toHexString(),
    shift_definition_id: shiftId.toHexString(),
    day_pattern: 'all' as const,
    match: {
      workforce_category: null,
      profession: { system: 'id.profession', code: 'nurse' },
      specialty: null,
      min_clinical_level: null,
    },
    min_count: 3,
    team_leader_required: false,
    period: { start: '2027-01-01', end: null },
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
          toObject: () => ({ ...stored, ...castIds(document), _id: requirementId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CoverageRequirementRepositoryModule],
    })
      .overrideProvider(getModelToken(CoverageRequirementEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    requirements = moduleRef.get(REPOSITORY_COVERAGE_REQUIREMENT)
  })

  it('maps a stored requirement to the model without storage fields', async () => {
    const found = await requirements.findOne(requirementId.toHexString())

    expect(found).toMatchObject({
      id: requirementId.toHexString(),
      tenant_id: tenantId.toHexString(),
      unit_id: unitId.toHexString(),
      shift_definition_id: shiftId.toHexString(),
      day_pattern: 'all',
      match: {
        workforce_category: null,
        profession: { system: 'id.profession', code: 'nurse' },
        specialty: null,
        min_clinical_level: { system: 'id.clinical-level', code: 'pk2' },
      },
      min_count: 3,
      team_leader_required: true,
      period: { start: '2027-01-01', end: null },
      status: 'active',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a requirement with no criteria and an end date', async () => {
    model.findOne.mockReturnValueOnce(
      chain({ ...stored, match: {}, period: { start: '2027-01-01', end: '2027-06-30' } }),
    )
    expect(await requirements.findOne(requirementId.toHexString())).toMatchObject({
      match: { workforce_category: null, profession: null, specialty: null, min_clinical_level: null },
      period: { start: '2027-01-01', end: '2027-06-30' },
    })
  })

  it('lists with its filters, the date filter included, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await requirements.findByFilter(tenant, {
      unitId: unitId.toHexString(),
      shiftId: shiftId.toHexString(),
      status: 'active',
      dayPattern: 'weekdays',
      onDate: '2027-03-01',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        unit_id: unitId.toHexString(),
        shift_definition_id: shiftId.toHexString(),
        status: 'active',
        day_pattern: 'weekdays',
        'period.start': { $lte: '2027-03-01' },
        $or: [{ 'period.end': null }, { 'period.end': { $gte: '2027-03-01' } }],
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await requirements.findByFilter('x')).toEqual([])
    expect(await requirements.findByFilter(tenant, { unitId: 'bad' })).toEqual([])
    expect(await requirements.findByFilter(tenant, { shiftId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await requirements.findByFilter(tenant)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('$or')
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('period.start')
  })

  it('finds the active requirements of a shift and of a unit and shift', async () => {
    const tenant = tenantId.toHexString()
    await requirements.findActiveByShift(tenant, shiftId.toHexString(), 1)
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, shift_definition_id: shiftId.toHexString(), status: 'active', deleted_at: null }),
    )
    await requirements.findActiveByUnitAndShift(tenant, unitId.toHexString(), shiftId.toHexString())
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ unit_id: unitId.toHexString(), shift_definition_id: shiftId.toHexString(), status: 'active' }),
    )
    model.find.mockClear()
    expect(await requirements.findActiveByShift('x', shiftId.toHexString(), 1)).toEqual([])
    expect(await requirements.findActiveByShift(tenant, 'bad', 1)).toEqual([])
    expect(await requirements.findActiveByUnitAndShift(tenant, 'bad', shiftId.toHexString())).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created requirement with the actor and records one change entry', async () => {
    await asAdmin(() => requirements.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'coverage_requirement' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(requirements.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('updates only the editable fields, never the unit or the shift', async () => {
    await asAdmin(() =>
      requirements.update(requirementId.toHexString(), {
        day_pattern: 'weekdays',
        match: input.match,
        min_count: 4,
        team_leader_required: true,
        period: { start: '2027-01-01', end: '2027-12-31' },
        status: 'retired',
        unit_id: new Types.ObjectId().toHexString(),
        shift_definition_id: new Types.ObjectId().toHexString(),
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['day_pattern', 'match', 'min_count', 'team_leader_required', 'period', 'status']),
    )
    for (const forbidden of ['unit_id', 'shift_definition_id']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => requirements.delete(requirementId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
