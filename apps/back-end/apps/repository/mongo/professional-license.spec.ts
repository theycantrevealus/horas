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
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import { REPOSITORY_PROFESSIONAL_LICENSE } from '@repository/token'
import { ProfessionalLicenseRepositoryModule } from './professional-license.module'
import { ProfessionalLicenseEntity } from './schema/professional-license'

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
const licenseId = new Types.ObjectId()
const previousId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: licenseId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  license_type: { system: 'id.license-type', code: 'sip' },
  eligibility_role: 'practice_permit',
  profession: { system: 'id.profession', code: 'dokter' },
  specialty: null,
  document_number: 'SIP 123.456',
  document_number_normalized: 'SIP123456',
  issuing_authority: { code: null, name: 'Dinas Kesehatan' },
  jurisdiction: { country: 'ID', subdivision: null },
  practice_location: { facility_id: facilityId, name: 'RS Sehat', address: null },
  issue_date: '2026-01-01',
  expiry_date: '2031-01-01',
  document: { file_id: 'f1', content_type: 'application/pdf', sha256: 'a'.repeat(64) },
  status: 'pending_verification',
  status_effective_date: '2026-02-01',
  is_live: true,
  submission: { via: 'hr', by: actor, at: new Date('2026-02-01T00:00:00Z') },
  verification: null,
  rejection: null,
  revocation: null,
  superseded: null,
  replaces_license_id: previousId,
  created_by: actor,
  created_at: new Date('2026-02-01T00:00:00Z'),
  updated_at: new Date('2026-02-01T00:00:00Z'),
  deleted_at: null,
}

describe('ProfessionalLicenseRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: licenseId }),
      })),
    ),
  }
  let licenses: ProfessionalLicenseRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    license_type: { system: 'id.license-type', code: 'str' },
    eligibility_role: 'registration' as const,
    profession: { system: 'id.profession', code: 'dokter' },
    specialty: null,
    document_number: 'STR 999',
    document_number_normalized: 'STR999',
    issuing_authority: { code: null, name: 'KKI' },
    jurisdiction: { country: 'ID', subdivision: null },
    practice_location: null,
    issue_date: '2026-01-01',
    expiry_date: null,
    document: { file_id: 'f2', content_type: 'image/png', sha256: 'b'.repeat(64) },
    status: 'pending_verification' as const,
    status_effective_date: '2026-02-01',
    is_live: true,
    submission: {
      via: 'self_service' as const,
      by: actor,
      at: new Date('2026-02-01T00:00:00Z'),
    },
    verification: null,
    rejection: null,
    revocation: null,
    superseded: null,
    replaces_license_id: null,
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
            _id: licenseId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, ProfessionalLicenseRepositoryModule],
    })
      .overrideProvider(
        getModelToken(ProfessionalLicenseEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    licenses = moduleRef.get(REPOSITORY_PROFESSIONAL_LICENSE)
  })

  it('maps a stored licence to the model without storage fields', async () => {
    const license = await licenses.findOne(licenseId.toHexString())

    expect(license).toMatchObject({
      id: licenseId.toHexString(),
      employee_id: employeeId.toHexString(),
      license_type: { code: 'sip' },
      eligibility_role: 'practice_permit',
      document_number_normalized: 'SIP123456',
      practice_location: {
        facility_id: facilityId.toHexString(),
        name: 'RS Sehat',
      },
      replaces_license_id: previousId.toHexString(),
      status: 'pending_verification',
      is_live: true,
      submission: { via: 'hr' },
    })
    expect(JSON.stringify(license)).not.toContain('"_id"')
    expect(JSON.stringify(license)).not.toContain('__v')
  })

  it('maps a licence with no location, no specialty and no renewal link', async () => {
    model.findOne.mockReturnValueOnce(
      chain({ ...stored, practice_location: null, replaces_license_id: null }),
    )

    expect(await licenses.findOne(licenseId.toHexString())).toMatchObject({
      practice_location: null,
      specialty: null,
      replaces_license_id: null,
    })
  })

  it('stamps a created licence with the actor and records one change entry', async () => {
    await asAdmin(() => licenses.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'professional_license' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(licenses.create(input)).rejects.toBeInstanceOf(RepositoryError)
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
      asAdmin(() => licenses.create(input)),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('lists by employee and with the filters of the licence list', async () => {
    const tenant = tenantId.toHexString()
    await licenses.findByEmployee(tenant, employeeId.toHexString())
    await licenses.findByFilter(tenant, {
      status: 'valid',
      licenseType: 'sip',
      facilityId: facilityId.toHexString(),
      expiresFrom: '2026-03-01',
      expiresTo: '2026-06-01',
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
      expect.objectContaining({
        status: 'valid',
        'license_type.code': 'sip',
        'practice_location.facility_id': facilityId.toHexString(),
        expiry_date: { $gte: '2026-03-01', $lte: '2026-06-01' },
      }),
    )
  })

  it('finds the live licence by type and normalized number', async () => {
    const found = await licenses.findLiveByNumber(
      tenantId.toHexString(),
      'id.license-type',
      'sip',
      'SIP123456',
    )

    expect(found).not.toBeNull()
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        'license_type.code': 'sip',
        document_number_normalized: 'SIP123456',
        is_live: true,
        deleted_at: null,
      }),
    )
  })

  it('answers an empty list or null for malformed identifiers without querying', async () => {
    expect(await licenses.findByEmployee('x', 'y')).toEqual([])
    expect(await licenses.findByFilter('x')).toEqual([])
    expect(
      await licenses.findByFilter(tenantId.toHexString(), { facilityId: 'bad' }),
    ).toEqual([])
    expect(await licenses.findLiveByNumber('x', 's', 'c', 'N')).toBeNull()
    expect(model.find).not.toHaveBeenCalled()
    expect(model.findOne).not.toHaveBeenCalled()
  })

  it('updates only the status and its records, never the employee, number or dates', async () => {
    await asAdmin(() =>
      licenses.update(licenseId.toHexString(), {
        status: 'valid',
        status_effective_date: '2026-03-01',
        employee_id: new Types.ObjectId().toHexString(),
        document_number: 'CHANGED',
        expiry_date: '2040-01-01',
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>
    }
    expect(Object.keys(update.$set)).toEqual(
      expect.arrayContaining(['status', 'status_effective_date']),
    )
    for (const forbidden of ['employee_id', 'document_number', 'expiry_date']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete', async () => {
    await expect(
      asAdmin(() => licenses.delete(licenseId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
