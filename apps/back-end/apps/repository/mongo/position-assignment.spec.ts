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
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { REPOSITORY_POSITION_ASSIGNMENT } from '@repository/token'
import { PositionAssignmentRepositoryModule } from './position-assignment.module'
import { PositionAssignmentEntity } from './schema/position-assignment'

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
const contractId = new Types.ObjectId()
const positionId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const assignmentId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: assignmentId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  contract_id: contractId,
  position_id: positionId,
  unit_id: unitId,
  facility_id: facilityId,
  is_primary: true,
  is_head_of_unit: false,
  kind: { system: 'id.assignment-kind', code: 'hire' },
  period: { start: '2026-01-01', end: null },
  fte: 1,
  status: 'active',
  is_open: true,
  decision_ref: { number: 'SK/001', document: null },
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('PositionAssignmentRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: assignmentId }),
      })),
    ),
  }
  let assignments: PositionAssignmentRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    contract_id: contractId.toHexString(),
    position_id: positionId.toHexString(),
    unit_id: unitId.toHexString(),
    facility_id: facilityId.toHexString(),
    is_primary: true,
    is_head_of_unit: false,
    kind: { system: 'id.assignment-kind', code: 'hire' },
    period: { start: '2026-02-01', end: null },
    fte: 1,
    status: 'active' as const,
    is_open: true,
    decision_ref: null,
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
            _id: assignmentId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PositionAssignmentRepositoryModule],
    })
      .overrideProvider(
        getModelToken(PositionAssignmentEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    assignments = moduleRef.get(REPOSITORY_POSITION_ASSIGNMENT)
  })

  it('maps a stored assignment to the model without storage fields', async () => {
    const assignment = await assignments.findOne(assignmentId.toHexString())

    expect(assignment).toMatchObject({
      id: assignmentId.toHexString(),
      employee_id: employeeId.toHexString(),
      contract_id: contractId.toHexString(),
      position_id: positionId.toHexString(),
      unit_id: unitId.toHexString(),
      facility_id: facilityId.toHexString(),
      is_primary: true,
      kind: { code: 'hire' },
      period: { start: '2026-01-01', end: null },
      status: 'active',
      is_open: true,
      decision_ref: { number: 'SK/001', document: null },
    })
    expect(JSON.stringify(assignment)).not.toContain('"_id"')
    expect(JSON.stringify(assignment)).not.toContain('__v')
  })

  it('stamps a created assignment with the actor and records one change entry', async () => {
    await asAdmin(() => assignments.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'position_assignment' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(assignments.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
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
      asAdmin(() => assignments.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('lists by employee, open by employee, open by position and by unit with their filters', async () => {
    const tenant = tenantId.toHexString()
    await assignments.findByEmployee(tenant, employeeId.toHexString())
    await assignments.findOpenByEmployee(tenant, employeeId.toHexString())
    await assignments.findOpenByPosition(tenant, positionId.toHexString())
    await assignments.findByUnit(tenant, unitId.toHexString(), {
      status: 'planned',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        employee_id: employeeId.toHexString(),
        deleted_at: null,
      }),
    )
    expect(model.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ is_open: true }),
    )
    expect(model.find).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        position_id: positionId.toHexString(),
        is_open: true,
      }),
    )
    expect(model.find).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        unit_id: unitId.toHexString(),
        status: 'planned',
      }),
    )
  })

  it('answers an empty list or false for malformed identifiers', async () => {
    expect(await assignments.findByEmployee('x', 'y')).toEqual([])
    expect(await assignments.findOpenByEmployee('x', 'y')).toEqual([])
    expect(await assignments.findOpenByPosition('x', 'y')).toEqual([])
    expect(await assignments.findByUnit('x', 'y')).toEqual([])
    expect(await assignments.findAnyOpenInUnit('x', 'y')).toBe(false)
    expect(model.find).not.toHaveBeenCalled()
  })

  it('tells whether a unit has an open assignment', async () => {
    const tenant = tenantId.toHexString()
    expect(await assignments.findAnyOpenInUnit(tenant, unitId.toHexString())).toBe(
      true,
    )
    model.find.mockImplementationOnce(() => chain([]))
    expect(await assignments.findAnyOpenInUnit(tenant, unitId.toHexString())).toBe(
      false,
    )
  })

  it('updates only status, openness and period, never the employee or position', async () => {
    await asAdmin(() =>
      assignments.update(assignmentId.toHexString(), {
        status: 'ended',
        is_open: false,
        period: { start: '2026-01-01', end: '2026-06-30' },
        employee_id: new Types.ObjectId().toHexString(),
        position_id: new Types.ObjectId().toHexString(),
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'is_open', 'period']),
    )
    expect(update.$set).not.toHaveProperty('employee_id')
    expect(update.$set).not.toHaveProperty('position_id')
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => assignments.delete(assignmentId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
