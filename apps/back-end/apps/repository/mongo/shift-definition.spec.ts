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
import { type ShiftDefinitionRepository } from '@repository/interface/shift-definition'
import { REPOSITORY_SHIFT_DEFINITION } from '@repository/token'
import { ShiftDefinitionRepositoryModule } from './shift-definition.module'
import { ShiftDefinitionEntity } from './schema/shift-definition'

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
const facilityId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const shiftId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: shiftId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  facility_id: facilityId,
  code: 'M',
  name: [{ locale: 'id-ID', text: 'Malam' }],
  type: 'regular',
  start_time: '21:00',
  end_time: '07:00',
  paid_minutes: 540,
  is_night: true,
  unit_ids: [unitId],
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('ShiftDefinitionRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: shiftId }),
      })),
    ),
  }
  let shifts: ShiftDefinitionRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    facility_id: facilityId.toHexString(),
    code: 'M',
    name: [{ locale: 'id-ID', text: 'Malam' }],
    type: 'regular' as const,
    start_time: '21:00',
    end_time: '07:00',
    paid_minutes: 540,
    is_night: true,
    unit_ids: [unitId.toHexString()],
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
          toObject: () => ({ ...stored, ...castIds(document), _id: shiftId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, ShiftDefinitionRepositoryModule],
    })
      .overrideProvider(getModelToken(ShiftDefinitionEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    shifts = moduleRef.get(REPOSITORY_SHIFT_DEFINITION)
  })

  it('maps a stored shift to the model without storage fields', async () => {
    const found = await shifts.findOne(shiftId.toHexString())

    expect(found).toMatchObject({
      id: shiftId.toHexString(),
      facility_id: facilityId.toHexString(),
      code: 'M',
      name: [{ locale: 'id-ID', text: 'Malam' }],
      type: 'regular',
      start_time: '21:00',
      end_time: '07:00',
      paid_minutes: 540,
      is_night: true,
      unit_ids: [unitId.toHexString()],
      status: 'active',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps an off shift without times', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, code: 'L', type: 'off', start_time: null, end_time: null, paid_minutes: 0, is_night: false, unit_ids: [] }))
    expect(await shifts.findOne(shiftId.toHexString())).toMatchObject({ type: 'off', start_time: null, end_time: null, paid_minutes: 0, unit_ids: [] })
  })

  it('finds by code in a facility and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(await shifts.findByCode(tenant, facilityId.toHexString(), 'M')).toMatchObject({ code: 'M' })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, facility_id: facilityId.toHexString(), code: 'M', deleted_at: null }),
    )
    model.findOne.mockClear()
    expect(await shifts.findByCode('x', facilityId.toHexString(), 'M')).toBeNull()
    expect(await shifts.findByCode(tenant, 'bad', 'M')).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('lists with its filters, the unit filter included, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await shifts.findByFilter(tenant, {
      facilityId: facilityId.toHexString(),
      status: 'active',
      type: 'regular',
      allowsUnitId: unitId.toHexString(),
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        facility_id: facilityId.toHexString(),
        status: 'active',
        type: 'regular',
        $or: [{ unit_ids: { $size: 0 } }, { unit_ids: unitId.toHexString() }],
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await shifts.findByFilter('x')).toEqual([])
    expect(await shifts.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(await shifts.findByFilter(tenant, { allowsUnitId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await shifts.findByFilter(tenant)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('$or')
  })

  it('stamps a created shift with the actor and records one change entry', async () => {
    await asAdmin(() => shifts.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'shift_definition' } })
  })

  it('refuses to write without an acting account, and translates a duplicate key into a conflict', async () => {
    await expect(shifts.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )
    await expect(asAdmin(() => shifts.create(input))).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('updates only the editable fields, never the facility, the code or the type', async () => {
    await asAdmin(() =>
      shifts.update(shiftId.toHexString(), {
        name: [{ locale: 'en', text: 'Night' }],
        start_time: '22:00',
        end_time: '06:00',
        paid_minutes: 420,
        is_night: true,
        unit_ids: [],
        status: 'retired',
        facility_id: new Types.ObjectId().toHexString(),
        code: 'X',
        type: 'off',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['name', 'start_time', 'end_time', 'paid_minutes', 'is_night', 'unit_ids', 'status']),
    )
    for (const forbidden of ['facility_id', 'code', 'type']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => shifts.delete(shiftId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
