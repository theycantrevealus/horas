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
import { type PracticeScheduleRepository } from '@repository/interface/practice-schedule'
import { REPOSITORY_PRACTICE_SCHEDULE } from '@repository/token'
import { PracticeScheduleRepositoryModule } from './practice-schedule.module'
import { PracticeScheduleEntity } from './schema/practice-schedule'

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
const unitId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const scheduleId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: scheduleId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  employee_id: employeeId,
  unit_id: unitId,
  facility_id: facilityId,
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  quota: 30,
  period: { start: '2099-03-01', end: null },
  status: 'active',
  created_by: actor,
  created_at: new Date('2027-03-01T00:00:00Z'),
  updated_at: new Date('2027-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('PracticeScheduleRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    ),
  }
  let schedules: PracticeScheduleRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    unit_id: unitId.toHexString(),
    facility_id: facilityId.toHexString(),
    day_of_week: 1,
    start_time: '08:00',
    end_time: '12:00',
    quota: 30,
    period: { start: '2099-03-01', end: null },
    status: 'active' as const,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PracticeScheduleRepositoryModule],
    })
      .overrideProvider(getModelToken(PracticeScheduleEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    schedules = moduleRef.get(REPOSITORY_PRACTICE_SCHEDULE)
  })

  it('maps a stored schedule to the model without storage fields', async () => {
    const found = await schedules.findOne(scheduleId.toHexString())

    expect(found).toMatchObject({
      id: scheduleId.toHexString(),
      tenant_id: tenantId.toHexString(),
      employee_id: employeeId.toHexString(),
      unit_id: unitId.toHexString(),
      facility_id: facilityId.toHexString(),
      day_of_week: 1,
      start_time: '08:00',
      end_time: '12:00',
      quota: 30,
      period: { start: '2099-03-01', end: null },
      status: 'active',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps no quota and an ended period', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, quota: undefined, period: { start: '2099-03-01', end: '2099-06-30' }, status: 'ended' }))

    expect(await schedules.findOne(scheduleId.toHexString())).toMatchObject({ quota: null, period: { start: '2099-03-01', end: '2099-06-30' }, status: 'ended' })
  })

  it('lists with its filters, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await schedules.findByFilter(tenant, { unitId: unitId.toHexString(), employeeId: employeeId.toHexString(), status: 'active', limit: 5, offset: 5 })

    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, unit_id: unitId.toHexString(), employee_id: employeeId.toHexString(), status: 'active', deleted_at: null }))
    model.find.mockClear()
    for (const query of [{ unitId: 'bad' }, { employeeId: 'bad' }]) {
      expect(await schedules.findByFilter(tenant, query)).toEqual([])
    }
    expect(await schedules.findByFilter('bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the schedules of a weekday whose period covers a date, whatever their status', async () => {
    const tenant = tenantId.toHexString()
    await schedules.findOnDate(tenant, 1, '2099-03-02', { unitId: unitId.toHexString() })

    const filter = model.find.mock.calls[0]?.[0] as Record<string, unknown>
    expect(filter).toMatchObject({ tenant_id: tenant, day_of_week: 1, 'period.start': { $lte: '2099-03-02' }, $or: [{ 'period.end': null }, { 'period.end': { $gte: '2099-03-02' } }], unit_id: unitId.toHexString(), deleted_at: null })
    expect(filter).not.toHaveProperty('status')
    model.find.mockClear()
    expect(await schedules.findOnDate('bad', 1, '2099-03-02')).toEqual([])
    expect(await schedules.findOnDate(tenant, 1, '2099-03-02', { employeeId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds every schedule of a doctor on a weekday, and nothing for a malformed id', async () => {
    const tenant = tenantId.toHexString()
    await schedules.findByEmployeeAndDay(tenant, employeeId.toHexString(), 1)

    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, employee_id: employeeId.toHexString(), day_of_week: 1, deleted_at: null }))
    model.find.mockClear()
    expect(await schedules.findByEmployeeAndDay(tenant, 'bad', 1)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created schedule with the actor and records one change entry', async () => {
    await asAdmin(() => schedules.create(input))

    expect(model.create).toHaveBeenCalledWith([expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 })])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'practice_schedule' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(schedules.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('updates only the times, quota, period and status, never the doctor, polyclinic or weekday', async () => {
    await asAdmin(() =>
      schedules.update(scheduleId.toHexString(), {
        start_time: '09:00',
        end_time: '13:00',
        quota: null,
        period: { start: '2099-03-01', end: '2099-06-30' },
        status: 'ended',
        employee_id: new Types.ObjectId().toHexString(),
        unit_id: new Types.ObjectId().toHexString(),
        facility_id: new Types.ObjectId().toHexString(),
        day_of_week: 3,
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['start_time', 'end_time', 'quota', 'period', 'status']))
    for (const forbidden of ['employee_id', 'unit_id', 'facility_id', 'day_of_week']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => schedules.delete(scheduleId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
