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
import { type RosterAssignmentRepository } from '@repository/interface/roster-assignment'
import { REPOSITORY_ROSTER_ASSIGNMENT } from '@repository/token'
import { RosterAssignmentRepositoryModule } from './roster-assignment.module'
import { RosterAssignmentEntity } from './schema/roster-assignment'

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
const rosterId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const shiftId = new Types.ObjectId()
const assignmentId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: assignmentId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  roster_id: rosterId,
  unit_id: unitId,
  facility_id: facilityId,
  employee_id: employeeId,
  date: '2027-03-10',
  shift: { definition_id: shiftId, code: 'M', type: 'regular', start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true },
  starts_at: new Date('2027-03-10T14:00:00Z'),
  ends_at: new Date('2027-03-11T00:00:00Z'),
  role: 'staff',
  status: 'planned',
  source: { kind: 'roster', ref_id: rosterId },
  change_reason: null,
  revision: 0,
  overtime: { minutes: 60, consent: { at: new Date('2027-03-01T00:00:00Z'), document: null } },
  flag: null,
  is_flagged: false,
  created_by: actor,
  created_at: new Date('2027-03-01T00:00:00Z'),
  updated_at: new Date('2027-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('RosterAssignmentRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), shift: stored.shift, source: stored.source, _id: assignmentId }),
      })),
    ),
  }
  let assignments: RosterAssignmentRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    roster_id: rosterId.toHexString(),
    unit_id: unitId.toHexString(),
    facility_id: facilityId.toHexString(),
    employee_id: employeeId.toHexString(),
    date: '2027-03-10',
    shift: { definition_id: shiftId.toHexString(), code: 'M', type: 'regular' as const, start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true },
    starts_at: new Date('2027-03-10T14:00:00Z'),
    ends_at: new Date('2027-03-11T00:00:00Z'),
    role: 'staff' as const,
    status: 'planned' as const,
    source: { kind: 'roster' as const, ref_id: rosterId.toHexString() },
    change_reason: null,
    revision: 0,
    overtime: null,
    flag: null,
    is_flagged: false,
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
          toObject: () => ({ ...stored, ...castIds(document), shift: stored.shift, source: stored.source, _id: assignmentId }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, RosterAssignmentRepositoryModule],
    })
      .overrideProvider(getModelToken(RosterAssignmentEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    assignments = moduleRef.get(REPOSITORY_ROSTER_ASSIGNMENT)
  })

  it('maps a stored assignment to the model without storage fields', async () => {
    const found = await assignments.findOne(assignmentId.toHexString())

    expect(found).toMatchObject({
      id: assignmentId.toHexString(),
      tenant_id: tenantId.toHexString(),
      roster_id: rosterId.toHexString(),
      unit_id: unitId.toHexString(),
      facility_id: facilityId.toHexString(),
      employee_id: employeeId.toHexString(),
      date: '2027-03-10',
      shift: { definition_id: shiftId.toHexString(), code: 'M', type: 'regular', start_time: '21:00', end_time: '07:00', paid_minutes: 540, is_night: true },
      starts_at: new Date('2027-03-10T14:00:00Z'),
      ends_at: new Date('2027-03-11T00:00:00Z'),
      role: 'staff',
      status: 'planned',
      source: { kind: 'roster', ref_id: rosterId.toHexString() },
      change_reason: null,
      revision: 0,
      overtime: { minutes: 60, consent: { at: new Date('2027-03-01T00:00:00Z'), document: null } },
      flag: null,
      is_flagged: false,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a day off, a flag and a source without a reference', async () => {
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        shift: { ...stored.shift, type: 'off', start_time: null, end_time: null, paid_minutes: 0, is_night: false },
        starts_at: null,
        ends_at: null,
        source: { kind: 'swap', ref_id: null },
        overtime: null,
        flag: { reason: 'eligibility_lost', failed: 'str', at: new Date('2027-03-02T00:00:00Z'), resolved_at: null },
        is_flagged: true,
      }),
    )
    const found = await assignments.findOne(assignmentId.toHexString())
    expect(found).toMatchObject({
      shift: { type: 'off', start_time: null, end_time: null },
      starts_at: null,
      ends_at: null,
      source: { kind: 'swap', ref_id: null },
      overtime: null,
      flag: { reason: 'eligibility_lost', failed: 'str', resolved_at: null },
      is_flagged: true,
    })
  })

  it('lists a roster with its filters, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await assignments.findByRoster(tenant, rosterId.toHexString(), {
      date: '2027-03-10',
      employeeId: employeeId.toHexString(),
      status: 'planned',
      limit: 5,
      offset: 5,
    })
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, roster_id: rosterId.toHexString(), employee_id: employeeId.toHexString(), status: 'planned', date: '2027-03-10', deleted_at: null }),
    )
    await assignments.findByRoster(tenant, rosterId.toHexString(), { from: '2027-03-01', to: '2027-03-15' })
    expect(model.find).toHaveBeenLastCalledWith(expect.objectContaining({ date: { $gte: '2027-03-01', $lte: '2027-03-15' } }))
    model.find.mockClear()
    expect(await assignments.findByRoster('x', rosterId.toHexString())).toEqual([])
    expect(await assignments.findByRoster(tenant, 'bad')).toEqual([])
    expect(await assignments.findByRoster(tenant, rosterId.toHexString(), { employeeId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the planned assignments of an employee in a date range, across rosters', async () => {
    const tenant = tenantId.toHexString()
    await assignments.findPlannedByEmployeeBetween(tenant, employeeId.toHexString(), '2027-03-01', '2027-03-20')
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, employee_id: employeeId.toHexString(), status: 'planned', date: { $gte: '2027-03-01', $lte: '2027-03-20' }, deleted_at: null }),
    )
    const call = model.find.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(call).not.toHaveProperty('roster_id')
    model.find.mockClear()
    expect(await assignments.findPlannedByEmployeeBetween('x', employeeId.toHexString(), 'a', 'b')).toEqual([])
    expect(await assignments.findPlannedByEmployeeBetween(tenant, 'bad', 'a', 'b')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the planned assignment of an employee on a date in a roster', async () => {
    const tenant = tenantId.toHexString()
    expect(await assignments.findPlannedByEmployeeAndDate(tenant, rosterId.toHexString(), employeeId.toHexString(), '2027-03-10')).toMatchObject({ date: '2027-03-10' })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ roster_id: rosterId.toHexString(), employee_id: employeeId.toHexString(), date: '2027-03-10', status: 'planned', deleted_at: null }),
    )
    model.findOne.mockClear()
    expect(await assignments.findPlannedByEmployeeAndDate('x', rosterId.toHexString(), employeeId.toHexString(), 'd')).toBeNull()
    expect(await assignments.findPlannedByEmployeeAndDate(tenant, 'bad', employeeId.toHexString(), 'd')).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('finds who is on duty in a unit at an instant, without flagged assignments', async () => {
    const tenant = tenantId.toHexString()
    const at = new Date('2027-03-10T15:00:00Z')
    await assignments.findOnDuty(tenant, unitId.toHexString(), at)
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        unit_id: unitId.toHexString(),
        status: 'planned',
        is_flagged: false,
        starts_at: { $lte: at },
        ends_at: { $gt: at },
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await assignments.findOnDuty('x', unitId.toHexString(), at)).toEqual([])
    expect(await assignments.findOnDuty(tenant, 'bad', at)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the planned assignments of a shift in some rosters, and nothing for none', async () => {
    const tenant = tenantId.toHexString()
    await assignments.findPlannedByShiftInRosters(tenant, shiftId.toHexString(), [rosterId.toHexString()], 1)
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, 'shift.definition_id': shiftId.toHexString(), roster_id: { $in: [rosterId.toHexString()] }, status: 'planned', deleted_at: null }),
    )
    model.find.mockClear()
    expect(await assignments.findPlannedByShiftInRosters(tenant, shiftId.toHexString(), [], 1)).toEqual([])
    expect(await assignments.findPlannedByShiftInRosters(tenant, 'bad', [rosterId.toHexString()], 1)).toEqual([])
    expect(await assignments.findPlannedByShiftInRosters(tenant, shiftId.toHexString(), ['bad'], 1)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created assignment with the actor and records one change entry', async () => {
    await asAdmin(() => assignments.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'roster_assignment' } })
  })

  it('creates many assignments of a roster with one change record each and the reason roster_import', async () => {
    const second = { ...input, employee_id: new Types.ObjectId().toHexString(), date: '2027-03-11' }

    const created = await asAdmin(() => assignments.createMany(input.roster_id, [input, second]))

    expect(created).toHaveLength(2)
    expect(model.create).toHaveBeenCalledTimes(1)
    expect(model.create.mock.calls[0]?.[0]).toHaveLength(2)
    expect(model.create.mock.calls[0]?.[0][0]).toMatchObject({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 })
    expect(appended).toHaveLength(2)
    for (const record of appended) {
      expect(record).toMatchObject({ action: 'create', entity: { type: 'roster_assignment' }, reason: 'roster_import' })
    }
  })

  it('writes nothing for an empty list, an assignment of another roster, or no acting account', async () => {
    expect(await asAdmin(() => assignments.createMany(input.roster_id, []))).toEqual([])
    await expect(asAdmin(() => assignments.createMany(input.roster_id, [input, { ...input, roster_id: new Types.ObjectId().toHexString() }]))).rejects.toBeInstanceOf(RepositoryError)
    await expect(assignments.createMany(input.roster_id, [input])).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    expect(appended).toHaveLength(0)
  })

  it('refuses to write without an acting account', async () => {
    await expect(assignments.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('updates only the changeable fields, never the roster, unit, facility, employee or date', async () => {
    await asAdmin(() =>
      assignments.update(assignmentId.toHexString(), {
        shift: input.shift,
        starts_at: null,
        ends_at: null,
        role: 'team_leader',
        status: 'cancelled',
        change_reason: 'Sakit',
        revision: 2,
        overtime: null,
        flag: null,
        is_flagged: false,
        roster_id: new Types.ObjectId().toHexString(),
        unit_id: new Types.ObjectId().toHexString(),
        facility_id: new Types.ObjectId().toHexString(),
        employee_id: new Types.ObjectId().toHexString(),
        date: '2028-01-01',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['shift', 'starts_at', 'ends_at', 'role', 'status', 'change_reason', 'revision', 'overtime', 'flag', 'is_flagged']),
    )
    for (const forbidden of ['roster_id', 'unit_id', 'facility_id', 'employee_id', 'date']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => assignments.delete(assignmentId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
