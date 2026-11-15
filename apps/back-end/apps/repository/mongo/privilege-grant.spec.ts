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
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { REPOSITORY_PRIVILEGE_GRANT } from '@repository/token'
import { PrivilegeGrantRepositoryModule } from './privilege-grant.module'
import { PrivilegeGrantEntity } from './schema/privilege-grant'

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
const employeeId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const unitId = new Types.ObjectId()
const appointmentId = new Types.ObjectId()
const itemId = new Types.ObjectId()
const supervisorId = new Types.ObjectId()
const supervisorGrantId = new Types.ObjectId()
const grantId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Director', kind: 'account' }
const stored = {
  _id: grantId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  appointment_id: appointmentId,
  employee_id: employeeId,
  facility_ids: [facilityId],
  unit_ids: [unitId],
  catalog_item_id: itemId,
  code: 'PD-012',
  condition: 'supervised',
  supervisor: { employee_id: supervisorId, grant_id: supervisorGrantId },
  restriction_notes: null,
  status: 'active',
  status_change: null,
  flag: null,
  created_by: actor,
  created_at: new Date('2026-03-10T00:00:00Z'),
  updated_at: new Date('2026-03-10T00:00:00Z'),
  deleted_at: null,
}

describe('PrivilegeGrantRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), supervisor: stored.supervisor, _id: grantId }),
      })),
    ),
  }
  let grants: PrivilegeGrantRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    appointment_id: appointmentId.toHexString(),
    employee_id: employeeId.toHexString(),
    facility_ids: [facilityId.toHexString()],
    unit_ids: [unitId.toHexString()],
    catalog_item_id: itemId.toHexString(),
    code: 'PD-012',
    condition: 'supervised' as const,
    supervisor: { employee_id: supervisorId.toHexString(), grant_id: supervisorGrantId.toHexString() },
    restriction_notes: null,
    status: 'active' as const,
    status_change: null,
    flag: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({ ...stored, ...castIds(document), supervisor: stored.supervisor, _id: grantId }),
        })),
    )
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, PrivilegeGrantRepositoryModule],
    })
      .overrideProvider(getModelToken(PrivilegeGrantEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    grants = moduleRef.get(REPOSITORY_PRIVILEGE_GRANT)
  })

  it('maps a stored grant to the model without storage fields', async () => {
    const found = await grants.findOne(grantId.toHexString())

    expect(found).toMatchObject({
      id: grantId.toHexString(),
      appointment_id: appointmentId.toHexString(),
      employee_id: employeeId.toHexString(),
      facility_ids: [facilityId.toHexString()],
      unit_ids: [unitId.toHexString()],
      catalog_item_id: itemId.toHexString(),
      code: 'PD-012',
      condition: 'supervised',
      supervisor: { employee_id: supervisorId.toHexString(), grant_id: supervisorGrantId.toHexString() },
      status: 'active',
      status_change: null,
      flag: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a grant without a supervisor', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, condition: 'restricted', supervisor: null, restriction_notes: 'Rawat jalan' }))
    expect(await grants.findOne(grantId.toHexString())).toMatchObject({ supervisor: null, restriction_notes: 'Rawat jalan' })
  })

  it('finds the grants of an appointment by tenant and appointment, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(await grants.findByAppointment(tenant, appointmentId.toHexString())).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: tenant, appointment_id: appointmentId.toHexString(), deleted_at: null }),
    )
    model.find.mockClear()
    expect(await grants.findByAppointment('x', appointmentId.toHexString())).toEqual([])
    expect(await grants.findByAppointment(tenant, 'bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds an active full grant by privilege, employee and facility, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(
      await grants.findActiveFullGrant(tenant, itemId.toHexString(), employeeId.toHexString(), facilityId.toHexString()),
    ).toMatchObject({ id: grantId.toHexString() })
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        catalog_item_id: itemId.toHexString(),
        employee_id: employeeId.toHexString(),
        facility_ids: facilityId.toHexString(),
        status: 'active',
        condition: 'full',
        deleted_at: null,
      }),
    )
    model.findOne.mockClear()
    for (const args of [['x', 'a', 'b', 'c'], [tenant, 'bad', employeeId.toHexString(), facilityId.toHexString()]] as const) {
      expect(await grants.findActiveFullGrant(args[0], args[1], args[2], args[3])).toBeNull()
    }
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('lists the privilege directory with its filters, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await grants.findByFilter(tenant, {
      catalogItemId: itemId.toHexString(),
      employeeId: employeeId.toHexString(),
      appointmentId: appointmentId.toHexString(),
      status: 'active',
      condition: 'supervised',
      facilityId: facilityId.toHexString(),
      unitId: unitId.toHexString(),
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        catalog_item_id: itemId.toHexString(),
        employee_id: employeeId.toHexString(),
        appointment_id: appointmentId.toHexString(),
        status: 'active',
        condition: 'supervised',
        facility_ids: facilityId.toHexString(),
        unit_ids: unitId.toHexString(),
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    for (const bad of [{ catalogItemId: 'bad' }, { employeeId: 'bad' }, { appointmentId: 'bad' }, { facilityId: 'bad' }, { unitId: 'bad' }]) {
      expect(await grants.findByFilter(tenant, bad)).toEqual([])
    }
    expect(await grants.findByFilter('x')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('filters on an open flag: with it, and without it', async () => {
    const tenant = tenantId.toHexString()
    await grants.findByFilter(tenant, { flagged: true })
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({ flag: { $ne: null }, 'flag.resolved_at': null }),
    )
    await grants.findByFilter(tenant, { flagged: false })
    expect(model.find).toHaveBeenLastCalledWith(
      expect.objectContaining({
        $or: [{ flag: null }, { 'flag.resolved_at': { $ne: null } }],
      }),
    )
    await grants.findByFilter(tenant)
    const plain = model.find.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(plain).not.toHaveProperty('flag')
    expect(plain).not.toHaveProperty('$or')
  })

  it('finds the grants that name a grant as their supervisor\'s grant, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(await grants.findBySupervisorGrant(tenant, supervisorGrantId.toHexString())).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        'supervisor.grant_id': supervisorGrantId.toHexString(),
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await grants.findBySupervisorGrant('x', supervisorGrantId.toHexString())).toEqual([])
    expect(await grants.findBySupervisorGrant(tenant, 'bad')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created grant with the actor and records one change entry', async () => {
    await asAdmin(() => grants.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'privilege_grant' } })
  })

  it('refuses to write without an acting account, and translates a duplicate key into a conflict', async () => {
    await expect(grants.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )
    await expect(asAdmin(() => grants.create(input))).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('updates only the status, the status change, the flag and the supervisor, never the privilege or the condition', async () => {
    await asAdmin(() =>
      grants.update(grantId.toHexString(), {
        status: 'revoked',
        status_change: { effective_date: '2026-04-01', reason: 'x', decision_ref: null },
        flag: null,
        condition: 'full',
        catalog_item_id: new Types.ObjectId().toHexString(),
        supervisor: { employee_id: supervisorId.toHexString(), grant_id: new Types.ObjectId().toHexString() },
        appointment_id: new Types.ObjectId().toHexString(),
        code: 'OTHER',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['status', 'status_change', 'flag', 'supervisor']))
    for (const forbidden of ['condition', 'catalog_item_id', 'appointment_id', 'code']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => grants.delete(grantId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
