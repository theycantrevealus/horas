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
import { type CredentialApplicationRepository } from '@repository/interface/credential-application'
import { REPOSITORY_CREDENTIAL_APPLICATION } from '@repository/token'
import { CredentialApplicationRepositoryModule } from './credential-application.module'
import { CredentialApplicationEntity } from './schema/credential-application'

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
const unitId = new Types.ObjectId()
const itemId = new Types.ObjectId()
const supervisorId = new Types.ObjectId()
const applicationId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: applicationId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  credentialing_facility_id: facilityId,
  credentialing_scope: 'facility',
  type: 'initial',
  committee: { system: 'id.committee', code: 'komite_medik' },
  status: 'draft',
  status_since: new Date('2026-03-01T00:00:00Z'),
  requested_privileges: [
    {
      catalog_item_id: itemId,
      code: 'PD-012',
      requested_condition: 'supervised',
      proposed_supervisor_employee_id: supervisorId,
      notes: null,
    },
  ],
  requested_unit_ids: [unitId],
  requested_facility_ids: [facilityId],
  documents: [
    {
      type: { system: 'id.evidence-type', code: 'certificate' },
      file: { file_id: 'f1', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
      license_id: null,
    },
  ],
  assessors: [],
  recommendation: null,
  decision: null,
  return_reason: null,
  withdrawal_reason: null,
  temporary: null,
  previous_appointment_id: null,
  created_by: actor,
  created_at: new Date('2026-03-01T00:00:00Z'),
  updated_at: new Date('2026-03-01T00:00:00Z'),
  deleted_at: null,
}

describe('CredentialApplicationRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: applicationId }),
      })),
    ),
  }
  let applications: CredentialApplicationRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    credentialing_facility_id: facilityId.toHexString(),
    credentialing_scope: 'facility' as const,
    type: 'initial' as const,
    committee: { system: 'id.committee', code: 'komite_medik' },
    status: 'draft' as const,
    status_since: new Date('2026-03-01T00:00:00Z'),
    requested_privileges: [],
    requested_unit_ids: [],
    requested_facility_ids: [],
    documents: [],
    assessors: [],
    recommendation: null,
    decision: null,
    return_reason: null,
    withdrawal_reason: null,
    temporary: null,
    previous_appointment_id: null,
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
            _id: applicationId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CredentialApplicationRepositoryModule],
    })
      .overrideProvider(
        getModelToken(CredentialApplicationEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    applications = moduleRef.get(REPOSITORY_CREDENTIAL_APPLICATION)
  })

  it('maps a stored application to the model without storage fields', async () => {
    const application = await applications.findOne(applicationId.toHexString())

    expect(application).toMatchObject({
      id: applicationId.toHexString(),
      employee_id: employeeId.toHexString(),
      credentialing_facility_id: facilityId.toHexString(),
      credentialing_scope: 'facility',
      type: 'initial',
      committee: { code: 'komite_medik' },
      status: 'draft',
      requested_privileges: [
        {
          catalog_item_id: itemId.toHexString(),
          code: 'PD-012',
          requested_condition: 'supervised',
          proposed_supervisor_employee_id: supervisorId.toHexString(),
        },
      ],
      requested_unit_ids: [unitId.toHexString()],
      requested_facility_ids: [facilityId.toHexString()],
      documents: [{ type: { code: 'certificate' }, file: { file_id: 'f1' }, license_id: null }],
      assessors: [],
      temporary: null,
      previous_appointment_id: null,
    })
    expect(JSON.stringify(application)).not.toContain('"_id"')
    expect(JSON.stringify(application)).not.toContain('__v')
  })

  it('maps a temporary application with a supervisor-less privilege and a linked licence', async () => {
    const licenseId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        type: 'temporary',
        temporary: { requested_days: 14, urgency: { system: 'id.temporary-urgency', code: 'disaster' } },
        requested_privileges: [{ ...stored.requested_privileges[0], proposed_supervisor_employee_id: null }],
        documents: [{ ...stored.documents[0], license_id: licenseId }],
      }),
    )

    expect(await applications.findOne(applicationId.toHexString())).toMatchObject({
      type: 'temporary',
      temporary: { requested_days: 14, urgency: { code: 'disaster' } },
      requested_privileges: [{ proposed_supervisor_employee_id: null }],
      documents: [{ license_id: licenseId.toHexString() }],
    })
  })

  it('stamps a created application with the actor and records one change entry', async () => {
    await asAdmin(() => applications.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'credential_application' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(applications.create(input)).rejects.toBeInstanceOf(RepositoryError)
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
      asAdmin(() => applications.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('lists the work queue with its filters, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const before = new Date('2026-03-05T00:00:00Z')
    await applications.findByFilter(tenant, {
      status: 'submitted',
      committee: 'komite_medik',
      facilityId: facilityId.toHexString(),
      employeeId: employeeId.toHexString(),
      statusBefore: before,
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'submitted',
        'committee.code': 'komite_medik',
        credentialing_facility_id: facilityId.toHexString(),
        employee_id: employeeId.toHexString(),
        status_since: { $lte: before },
        deleted_at: null,
      }),
    )
    expect(await applications.findByFilter('x')).toEqual([])
    expect(await applications.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(await applications.findByFilter(tenant, { employeeId: 'bad' })).toEqual([])
    expect(model.find).toHaveBeenCalledTimes(1)
  })

  it('finds the open renewal of an SPK, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const previous = new Types.ObjectId().toHexString()
    expect(await applications.findOpenRenewal(tenant, previous)).toMatchObject({ id: applicationId.toHexString() })
    expect(model.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        previous_appointment_id: previous,
        status: { $nin: ['approved', 'rejected', 'withdrawn'] },
        deleted_at: null,
      }),
    )
    model.findOne.mockClear()
    expect(await applications.findOpenRenewal('x', previous)).toBeNull()
    expect(await applications.findOpenRenewal(tenant, 'bad')).toBeNull()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('updates the process fields, never the applicant, the facility, the committee, the scope or the type', async () => {
    await asAdmin(() =>
      applications.update(applicationId.toHexString(), {
        status: 'submitted',
        status_since: new Date('2026-03-02T00:00:00Z'),
        return_reason: 'Dokumen kurang',
        employee_id: new Types.ObjectId().toHexString(),
        credentialing_facility_id: new Types.ObjectId().toHexString(),
        committee: { system: 'id.committee', code: 'other' },
        type: 'temporary',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'status_since', 'return_reason']),
    )
    for (const forbidden of ['employee_id', 'credentialing_facility_id', 'committee', 'type']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => applications.delete(applicationId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
