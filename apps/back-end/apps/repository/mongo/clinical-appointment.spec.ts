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
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { REPOSITORY_CLINICAL_APPOINTMENT } from '@repository/token'
import { ClinicalAppointmentRepositoryModule } from './clinical-appointment.module'
import { ClinicalAppointmentEntity } from './schema/clinical-appointment'

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
const applicationId = new Types.ObjectId()
const directorId = new Types.ObjectId()
const appointmentId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Director', kind: 'account' }
const stored = {
  _id: appointmentId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  appointment_number: 'SPK/001/2026',
  employee_id: employeeId,
  credentialing_facility_id: facilityId,
  credentialing_scope: 'facility',
  facility_ids: [facilityId],
  unit_ids: [unitId],
  source_application_id: applicationId,
  valid_period: { start: '2026-03-10', end: '2029-03-09' },
  is_temporary: false,
  status: 'active',
  is_current: true,
  issued: { by: actor, director_employee_id: directorId, date: '2026-03-10' },
  signed_document: null,
  suspension: null,
  revocation: null,
  superseded_by_id: null,
  created_by: actor,
  created_at: new Date('2026-03-10T00:00:00Z'),
  updated_at: new Date('2026-03-10T00:00:00Z'),
  deleted_at: null,
}

describe('ClinicalAppointmentRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), issued: stored.issued, _id: appointmentId }),
      })),
    ),
  }
  let appointments: ClinicalAppointmentRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    appointment_number: 'SPK/001/2026',
    employee_id: employeeId.toHexString(),
    credentialing_facility_id: facilityId.toHexString(),
    credentialing_scope: 'facility' as const,
    facility_ids: [facilityId.toHexString()],
    unit_ids: [unitId.toHexString()],
    source_application_id: applicationId.toHexString(),
    valid_period: { start: '2026-03-10', end: '2029-03-09' },
    is_temporary: false,
    status: 'active' as const,
    is_current: true,
    issued: { by: actor as never, director_employee_id: directorId.toHexString(), date: '2026-03-10' },
    signed_document: null,
    suspension: null,
    revocation: null,
    superseded_by_id: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({ ...stored, ...castIds(document), issued: stored.issued, _id: appointmentId }),
        })),
    )
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, ClinicalAppointmentRepositoryModule],
    })
      .overrideProvider(getModelToken(ClinicalAppointmentEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    appointments = moduleRef.get(REPOSITORY_CLINICAL_APPOINTMENT)
  })

  it('finds current appointments of every tenant that end on or before a date, soonest end first', async () => {
    const found = await appointments.findCurrentEndedOnOrBefore('2027-03-10', 50)

    expect(found).toHaveLength(1)
    const filter = model.find.mock.calls[0]?.[0] as Record<string, unknown>
    expect(filter).toEqual({
      status: { $in: ['active', 'suspended'] },
      'valid_period.end': { $lte: '2027-03-10' },
      deleted_at: null,
    })
    expect(filter).not.toHaveProperty('tenant_id')
  })

  it('maps a stored appointment to the model without storage fields', async () => {
    const found = await appointments.findOne(appointmentId.toHexString())

    expect(found).toMatchObject({
      id: appointmentId.toHexString(),
      appointment_number: 'SPK/001/2026',
      employee_id: employeeId.toHexString(),
      credentialing_facility_id: facilityId.toHexString(),
      credentialing_scope: 'facility',
      facility_ids: [facilityId.toHexString()],
      unit_ids: [unitId.toHexString()],
      source_application_id: applicationId.toHexString(),
      valid_period: { start: '2026-03-10', end: '2029-03-09' },
      is_temporary: false,
      status: 'active',
      is_current: true,
      issued: { director_employee_id: directorId.toHexString(), date: '2026-03-10' },
      suspension: null,
      revocation: null,
      superseded_by_id: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('finds by letter number and the current regular appointment, with tenant filters, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(await appointments.findByNumber(tenant, 'SPK/001/2026')).toMatchObject({ appointment_number: 'SPK/001/2026' })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenant_id: tenant, appointment_number: 'SPK/001/2026', deleted_at: null }),
    )
    await appointments.findCurrentRegular(tenant, employeeId.toHexString(), facilityId.toHexString())
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employeeId.toHexString(),
        credentialing_facility_id: facilityId.toHexString(),
        is_current: true,
        is_temporary: false,
      }),
    )
    model.findOne.mockClear()
    expect(await appointments.findByNumber('x', 'SPK/001/2026')).toBeNull()
    expect(await appointments.findCurrentRegular(tenant, 'bad', facilityId.toHexString())).toBeNull()
    expect(await appointments.findCurrentRegular(tenant, employeeId.toHexString(), 'bad')).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('lists appointments with its filters, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await appointments.findByFilter(tenant, {
      status: 'active',
      current: true,
      employeeId: employeeId.toHexString(),
      facilityId: facilityId.toHexString(),
      unitId: unitId.toHexString(),
      endOnOrBefore: '2026-06-30',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        status: 'active',
        is_current: true,
        employee_id: employeeId.toHexString(),
        facility_ids: facilityId.toHexString(),
        unit_ids: unitId.toHexString(),
        'valid_period.end': { $lte: '2026-06-30' },
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await appointments.findByFilter('x')).toEqual([])
    expect(await appointments.findByFilter(tenant, { employeeId: 'bad' })).toEqual([])
    expect(await appointments.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(await appointments.findByFilter(tenant, { unitId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    expect(await appointments.findByFilter(tenant)).toHaveLength(1)
  })

  it('lists one practitioner\'s appointments, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    expect(await appointments.findByEmployee(tenant, employeeId.toHexString(), { limit: 3 })).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: tenant, employee_id: employeeId.toHexString(), deleted_at: null }),
    )
    model.find.mockClear()
    expect(await appointments.findByEmployee(tenant, 'bad')).toEqual([])
    expect(await appointments.findByEmployee('x', employeeId.toHexString())).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('stamps a created appointment with the actor and records one change entry', async () => {
    await asAdmin(() => appointments.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'clinical_appointment' } })
  })

  it('refuses to write without an acting account', async () => {
    await expect(appointments.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )

    await expect(asAdmin(() => appointments.create(input))).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('updates only the status fields, never the practitioner, the facility, the units, the number or the period', async () => {
    await asAdmin(() =>
      appointments.update(appointmentId.toHexString(), {
        status: 'revoked',
        is_current: false,
        revocation: { effective_date: '2026-04-01', reason: 'x', decision_ref: null },
        appointment_number: 'OTHER',
        employee_id: new Types.ObjectId().toHexString(),
        unit_ids: [],
        valid_period: { start: '2020-01-01', end: '2020-01-02' },
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['status', 'is_current', 'revocation']))
    for (const forbidden of ['appointment_number', 'employee_id', 'unit_ids', 'valid_period']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(asAdmin(() => appointments.delete(appointmentId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
