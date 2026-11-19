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
import { type HolidayCalendarRepository } from '@repository/interface/holiday-calendar'
import { REPOSITORY_HOLIDAY_CALENDAR } from '@repository/token'
import { HolidayCalendarRepositoryModule } from './holiday-calendar.module'
import { HolidayCalendarEntity } from './schema/holiday-calendar'

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
const calendarId = new Types.ObjectId()
const importId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: calendarId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  code: 'id-national',
  year: 2027,
  country: 'ID',
  subdivision: null,
  holidays: [
    {
      date: '2027-08-17',
      name: [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }],
      kind: 'public',
      source: 'imported',
      status: 'active',
      import_id: importId,
    },
  ],
  last_import_id: importId,
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('HolidayCalendarRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: calendarId }),
      })),
    ),
  }
  let calendars: HolidayCalendarRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    code: 'id-national',
    year: 2027,
    country: 'ID',
    subdivision: null,
    holidays: [],
    last_import_id: null,
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
          toObject: () => ({ ...stored, ...castIds(document), _id: calendarId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, HolidayCalendarRepositoryModule],
    })
      .overrideProvider(getModelToken(HolidayCalendarEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    calendars = moduleRef.get(REPOSITORY_HOLIDAY_CALENDAR)
  })

  it('maps a stored calendar to the model without storage fields', async () => {
    const found = await calendars.findOne(calendarId.toHexString())

    expect(found).toMatchObject({
      id: calendarId.toHexString(),
      tenant_id: tenantId.toHexString(),
      code: 'id-national',
      year: 2027,
      country: 'ID',
      subdivision: null,
      last_import_id: importId.toHexString(),
      holidays: [
        {
          date: '2027-08-17',
          name: [{ locale: 'id-ID', text: 'Hari Kemerdekaan' }],
          kind: 'public',
          source: 'imported',
          status: 'active',
          import_id: importId.toHexString(),
        },
      ],
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a manual holiday without an import', async () => {
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        last_import_id: null,
        holidays: [{ ...stored.holidays[0], source: 'manual', import_id: null }],
      }),
    )
    const found = await calendars.findOne(calendarId.toHexString())
    expect(found?.last_import_id).toBeNull()
    expect(found?.holidays[0]).toMatchObject({ source: 'manual', import_id: null })
  })

  it('finds by code and year, and answers null for a malformed tenant', async () => {
    const tenant = tenantId.toHexString()
    expect(await calendars.findByCodeAndYear(tenant, 'id-national', 2027)).toMatchObject({
      code: 'id-national',
    })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, code: 'id-national', year: 2027, deleted_at: null }),
    )
    model.findOne.mockClear()
    expect(await calendars.findByCodeAndYear('x', 'id-national', 2027)).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('lists with its filters and answers an empty list for a malformed tenant', async () => {
    const tenant = tenantId.toHexString()
    await calendars.findByFilter(tenant, { code: 'id-national', year: 2027, country: 'ID', limit: 5, offset: 5 })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: tenant, code: 'id-national', year: 2027, country: 'ID', deleted_at: null }),
    )
    model.find.mockClear()
    expect(await calendars.findByFilter('x')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await calendars.findByFilter(tenant)
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('code')
    expect(model.find.mock.calls[0]?.[0]).not.toHaveProperty('year')
  })

  it('stamps a created calendar with the actor and records one change entry', async () => {
    await asAdmin(() => calendars.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'holiday_calendar' } })
  })

  it('refuses to write without an acting account, and translates a duplicate key into a conflict', async () => {
    await expect(calendars.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )
    await expect(asAdmin(() => calendars.create(input))).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('updates only the holidays and the last import, never the code, the year or the country', async () => {
    await asAdmin(() =>
      calendars.update(calendarId.toHexString(), {
        holidays: [],
        last_import_id: importId.toHexString(),
        code: 'x',
        year: 2030,
        country: 'SG',
        subdivision: 'SG-01',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['holidays', 'last_import_id']))
    for (const forbidden of ['code', 'year', 'country', 'subdivision']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => calendars.delete(calendarId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })

  it('finds the calendars of every tenant that have an active day of one kind on a date, for the jobs', async () => {
    const found = await calendars.findWithKindOnDate('collective_leave', '2027-03-01')

    expect(found).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith({
      holidays: { $elemMatch: { date: '2027-03-01', kind: 'collective_leave', status: 'active' } },
      deleted_at: null,
    })
  })
})
