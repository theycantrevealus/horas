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
import { type CommitteeMembershipRepository } from '@repository/interface/committee-membership'
import { REPOSITORY_COMMITTEE_MEMBERSHIP } from '@repository/token'
import { CommitteeMembershipRepositoryModule } from './committee-membership.module'
import { CommitteeMembershipEntity } from './schema/committee-membership'

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
const facilityId = new Types.ObjectId()
const membershipId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: membershipId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  facility_id: facilityId,
  committee: { system: 'id.committee', code: 'komite_medik' },
  role: { system: 'id.committee-role', code: 'chair' },
  period: { start: '2026-01-01', end: null },
  decision_ref: { number: 'SK/001', document: null },
  status: 'active',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('CommitteeMembershipRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: membershipId }),
      })),
    ),
  }
  let memberships: CommitteeMembershipRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    facility_id: facilityId.toHexString(),
    committee: { system: 'id.committee', code: 'komite_medik' },
    role: { system: 'id.committee-role', code: 'member' },
    period: { start: '2026-02-01', end: null },
    decision_ref: null,
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
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: membershipId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CommitteeMembershipRepositoryModule],
    })
      .overrideProvider(
        getModelToken(CommitteeMembershipEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    memberships = moduleRef.get(REPOSITORY_COMMITTEE_MEMBERSHIP)
  })

  it('maps a stored membership to the model without storage fields', async () => {
    const membership = await memberships.findOne(membershipId.toHexString())

    expect(membership).toMatchObject({
      id: membershipId.toHexString(),
      employee_id: employeeId.toHexString(),
      facility_id: facilityId.toHexString(),
      committee: { code: 'komite_medik' },
      role: { code: 'chair' },
      period: { start: '2026-01-01', end: null },
      decision_ref: { number: 'SK/001', document: null },
      status: 'active',
    })
    expect(JSON.stringify(membership)).not.toContain('"_id"')
    expect(JSON.stringify(membership)).not.toContain('__v')
  })

  it('stamps a created membership with the actor and records one change entry', async () => {
    await asAdmin(() => memberships.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'committee_membership' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(memberships.create(input)).rejects.toBeInstanceOf(
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
      asAdmin(() => memberships.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('lists a facility with its filters and finds the active membership by person and by role', async () => {
    const tenant = tenantId.toHexString()
    const facility = facilityId.toHexString()
    await memberships.findByFacility(tenant, facility, {
      committee: 'komite_medik',
      role: 'chair',
      status: 'active',
      limit: 5,
      offset: 5,
    })
    const mine = await memberships.findActiveForEmployee(
      tenant,
      employeeId.toHexString(),
      facility,
      'komite_medik',
    )
    const chair = await memberships.findActiveByRole(
      tenant,
      facility,
      'komite_medik',
      'chair',
    )

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        facility_id: facility,
        'committee.code': 'komite_medik',
        'role.code': 'chair',
        status: 'active',
        deleted_at: null,
      }),
    )
    expect(mine).not.toBeNull()
    expect(chair).not.toBeNull()
    expect(model.findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        employee_id: employeeId.toHexString(),
        status: 'active',
      }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ 'role.code': 'chair', status: 'active' }),
    )
  })

  it('answers an empty list or null for malformed identifiers without querying', async () => {
    expect(await memberships.findByFacility('x', 'y')).toEqual([])
    expect(await memberships.findActiveForEmployee('x', 'y', 'z', 'c')).toBeNull()
    expect(await memberships.findActiveByRole('x', 'y', 'c', 'chair')).toBeNull()
    expect(model.find).not.toHaveBeenCalled()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('updates only the status and the period, never the person or the committee', async () => {
    await asAdmin(() =>
      memberships.update(membershipId.toHexString(), {
        status: 'ended',
        period: { start: '2026-01-01', end: '2026-06-30' },
        employee_id: new Types.ObjectId().toHexString(),
        committee: { system: 'id.committee', code: 'other' },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'period']),
    )
    expect(update.$set).not.toHaveProperty('employee_id')
    expect(update.$set).not.toHaveProperty('committee')
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => memberships.delete(membershipId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
