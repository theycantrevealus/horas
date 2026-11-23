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
import { type PracticeScheduleExceptionRepository } from '@repository/interface/practice-schedule-exception'
import { REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION } from '@repository/token'
import { PracticeScheduleExceptionRepositoryModule } from './practice-schedule-exception.module'
import { PracticeScheduleExceptionEntity, PracticeScheduleExceptionSchema } from './schema/practice-schedule-exception'

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
const scheduleId = new Types.ObjectId()
const exceptionId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: exceptionId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  schedule_id: scheduleId,
  employee_id: employeeId,
  unit_id: unitId,
  date: '2099-03-09',
  kind: 'moved',
  moved_to: { date: '2099-03-10', start_time: '10:00', end_time: '11:00' },
  reason: { system: 'id.practice-exception-reason', code: 'leave' },
  source: { kind: 'manual', ref_id: null },
  created_by: actor,
  created_at: new Date('2027-03-01T00:00:00Z'),
  updated_at: new Date('2027-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('PracticeScheduleExceptionRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    updateOne: vi.fn((..._args: unknown[]) => chain({ acknowledged: true })),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    ),
  }
  let exceptions: PracticeScheduleExceptionRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    schedule_id: scheduleId.toHexString(),
    employee_id: employeeId.toHexString(),
    unit_id: unitId.toHexString(),
    date: '2099-03-09',
    kind: 'moved' as const,
    moved_to: { date: '2099-03-10', start_time: '10:00', end_time: '11:00' },
    reason: { system: 'id.practice-exception-reason', code: 'leave' },
    source: { kind: 'manual' as const, ref_id: null },
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.updateOne.mockImplementation(() => chain({ acknowledged: true }))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map(() => ({ toObject: () => ({ ...stored }) })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PracticeScheduleExceptionRepositoryModule],
    })
      .overrideProvider(getModelToken(PracticeScheduleExceptionEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    exceptions = moduleRef.get(REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION)
  })

  it('maps a stored exception to the model without storage fields', async () => {
    const found = await exceptions.findOne(exceptionId.toHexString())

    expect(found).toMatchObject({
      id: exceptionId.toHexString(),
      tenant_id: tenantId.toHexString(),
      schedule_id: scheduleId.toHexString(),
      employee_id: employeeId.toHexString(),
      unit_id: unitId.toHexString(),
      date: '2099-03-09',
      kind: 'moved',
      moved_to: { date: '2099-03-10', start_time: '10:00', end_time: '11:00' },
      reason: { system: 'id.practice-exception-reason', code: 'leave' },
      source: { kind: 'manual', ref_id: null },
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a cancelled session and a source that names a leave', async () => {
    const leaveId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(chain({ ...stored, kind: 'cancelled', moved_to: null, source: { kind: 'leave', ref_id: leaveId } }))

    expect(await exceptions.findOne(exceptionId.toHexString())).toMatchObject({ kind: 'cancelled', moved_to: null, source: { kind: 'leave', ref_id: leaveId.toHexString() } })
  })

  it('maps an exception made by leave, which has no reason, to a null reason', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, reason: null, source: { kind: 'leave', ref_id: new Types.ObjectId() } }))
    model.findOne.mockReturnValueOnce(chain({ ...stored, reason: undefined }))

    expect((await exceptions.findOne(exceptionId.toHexString()))?.reason).toBeNull()
    expect((await exceptions.findOne(exceptionId.toHexString()))?.reason).toBeNull()
  })

  it('finds the exceptions of a doctor that move a session after a date, and nothing for malformed identifiers', async () => {
    const tenant = tenantId.toHexString()

    await exceptions.findMovedAfterByEmployee(tenant, employeeId.toHexString(), '2026-12-31')

    expect(model.find).toHaveBeenCalledWith({ tenant_id: tenant, employee_id: employeeId.toHexString(), kind: 'moved', 'moved_to.date': { $gt: '2026-12-31' }, deleted_at: null })
    model.find.mockClear()
    expect(await exceptions.findMovedAfterByEmployee('x', employeeId.toHexString(), 'd')).toEqual([])
    expect(await exceptions.findMovedAfterByEmployee(tenant, 'bad', 'd')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the exceptions a leave made, and nothing for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const leave = new Types.ObjectId().toHexString()
    model.find.mockReturnValueOnce(chain([stored]))

    expect(await exceptions.findByLeave(tenant, leave)).toHaveLength(1)

    expect(model.find).toHaveBeenCalledWith({ tenant_id: tenant, 'source.kind': 'leave', 'source.ref_id': leave, deleted_at: null })
    model.find.mockClear()
    expect(await exceptions.findByLeave(tenant, 'bad')).toEqual([])
    expect(await exceptions.findByLeave('x', leave)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    expect(PracticeScheduleExceptionSchema.indexes()).toContainEqual([{ tenant_id: 1, 'source.ref_id': 1 }, expect.objectContaining({ partialFilterExpression: { 'source.kind': 'leave' } })])
  })

  it('finds the exception in force of a schedule on a date, and nothing for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await exceptions.findByScheduleAndDate(tenant, scheduleId.toHexString(), '2099-03-09')

    expect(model.findOne).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, schedule_id: scheduleId.toHexString(), date: '2099-03-09', deleted_at: null }))
    model.findOne.mockClear()
    expect(await exceptions.findByScheduleAndDate('bad', scheduleId.toHexString(), '2099-03-09')).toBeNull()
    expect(await exceptions.findByScheduleAndDate(tenant, 'bad', '2099-03-09')).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('finds the exceptions in force on a date for some schedules, and nothing for none or a malformed id', async () => {
    const tenant = tenantId.toHexString()
    const id = scheduleId.toHexString()
    await exceptions.findBySchedulesAndDate(tenant, [id], '2099-03-09')

    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, schedule_id: { $in: [id] }, date: '2099-03-09', deleted_at: null }))
    model.find.mockClear()
    expect(await exceptions.findBySchedulesAndDate(tenant, [], '2099-03-09')).toEqual([])
    expect(await exceptions.findBySchedulesAndDate(tenant, ['bad'], '2099-03-09')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the sessions moved onto a date with its filters, and nothing for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await exceptions.findMovedTo(tenant, '2099-03-10', { unitId: unitId.toHexString(), employeeId: employeeId.toHexString(), limit: 5 })

    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, kind: 'moved', 'moved_to.date': '2099-03-10', deleted_at: null, unit_id: unitId.toHexString(), employee_id: employeeId.toHexString() }))
    model.find.mockClear()
    expect(await exceptions.findMovedTo('bad', '2099-03-10')).toEqual([])
    expect(await exceptions.findMovedTo(tenant, '2099-03-10', { unitId: 'bad' })).toEqual([])
    expect(await exceptions.findMovedTo(tenant, '2099-03-10', { employeeId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the exceptions of a doctor that touch a date, cancelled or moved away and moved onto it', async () => {
    const tenant = tenantId.toHexString()
    await exceptions.findByEmployeeAndDate(tenant, employeeId.toHexString(), '2099-03-10')

    expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: tenant, employee_id: employeeId.toHexString(), deleted_at: null, $or: [{ date: '2099-03-10' }, { 'moved_to.date': '2099-03-10' }] }))
    model.find.mockClear()
    expect(await exceptions.findByEmployeeAndDate(tenant, 'bad', '2099-03-10')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created exception with the actor and records one change entry', async () => {
    await asAdmin(() => exceptions.create(input))

    expect(model.create).toHaveBeenCalledWith([expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 })])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'practice_schedule_exception' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(exceptions.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('soft-deletes an exception and records the change, and has no update and no delete', async () => {
    await asAdmin(() => exceptions.deleteSoft(exceptionId.toHexString()))

    const update = model.updateOne.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(update.$set).toHaveProperty('deleted_at')
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'soft_delete', entity: { type: 'practice_schedule_exception' } })
    await expect(asAdmin(() => exceptions.update(exceptionId.toHexString(), { kind: 'cancelled' }))).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => exceptions.delete(exceptionId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
