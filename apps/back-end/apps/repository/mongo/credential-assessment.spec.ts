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
import { type CredentialAssessmentRepository } from '@repository/interface/credential-assessment'
import { REPOSITORY_CREDENTIAL_ASSESSMENT } from '@repository/token'
import { CredentialAssessmentRepositoryModule } from './credential-assessment.module'
import { CredentialAssessmentEntity } from './schema/credential-assessment'

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
const applicationId = new Types.ObjectId()
const applicantId = new Types.ObjectId()
const assessorId = new Types.ObjectId()
const itemId = new Types.ObjectId()
const assessmentId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Assessor', kind: 'account' }
const stored = {
  _id: assessmentId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  application_id: applicationId,
  employee_id: applicantId,
  assessor_employee_id: assessorId,
  catalog_item_id: itemId,
  methods: [{ system: 'id.assessment-method', code: 'interview' }],
  outcome: 'recommended',
  recommended_condition: 'full',
  reason: 'Kompeten',
  assessed_at: new Date('2026-03-05T00:00:00Z'),
  created_by: actor,
  created_at: new Date('2026-03-05T00:00:00Z'),
  updated_at: new Date('2026-03-05T00:00:00Z'),
  deleted_at: null,
}

describe('CredentialAssessmentRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: assessmentId }),
      })),
    ),
  }
  let assessments: CredentialAssessmentRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    application_id: applicationId.toHexString(),
    employee_id: applicantId.toHexString(),
    assessor_employee_id: assessorId.toHexString(),
    catalog_item_id: itemId.toHexString(),
    methods: [{ system: 'id.assessment-method', code: 'interview' }],
    outcome: 'recommended' as const,
    recommended_condition: 'full' as const,
    reason: 'Kompeten',
    assessed_at: new Date('2026-03-05T00:00:00Z'),
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.find.mockImplementation(() => chain([stored]))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: assessmentId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, CredentialAssessmentRepositoryModule],
    })
      .overrideProvider(
        getModelToken(CredentialAssessmentEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    assessments = moduleRef.get(REPOSITORY_CREDENTIAL_ASSESSMENT)
  })

  it('maps stored assessments to the model without storage fields', async () => {
    const found = await assessments.findByApplication(
      tenantId.toHexString(),
      applicationId.toHexString(),
    )

    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({
      id: assessmentId.toHexString(),
      application_id: applicationId.toHexString(),
      employee_id: applicantId.toHexString(),
      assessor_employee_id: assessorId.toHexString(),
      catalog_item_id: itemId.toHexString(),
      methods: [{ system: 'id.assessment-method', code: 'interview' }],
      outcome: 'recommended',
      recommended_condition: 'full',
      reason: 'Kompeten',
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('filters by tenant and application, and by assessor, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    await assessments.findByAssessor(
      tenant,
      applicationId.toHexString(),
      assessorId.toHexString(),
    )

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        application_id: applicationId.toHexString(),
        assessor_employee_id: assessorId.toHexString(),
        deleted_at: null,
      }),
    )
    expect(await assessments.findByApplication('x', applicationId.toHexString())).toEqual([])
    expect(await assessments.findByApplication(tenant, 'bad')).toEqual([])
    expect(await assessments.findByAssessor(tenant, applicationId.toHexString(), 'bad')).toEqual([])
    expect(model.find).toHaveBeenCalledTimes(1)
  })

  it('stamps a created assessment with the actor and records one change entry', async () => {
    await asAdmin(() => assessments.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'credential_assessment' },
    })
    expect(JSON.stringify(appended[0])).not.toContain('Kompeten')
  })

  it('refuses to write without an acting account', async () => {
    await expect(assessments.create(input)).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
  })

  it('translates a duplicate key into a conflict', async () => {
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({ message: 'E11000 duplicate key', code: 11000 }),
    )

    await expect(asAdmin(() => assessments.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('has no update and no delete', async () => {
    await expect(
      asAdmin(() => assessments.update(assessmentId.toHexString(), { reason: 'x' })),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => assessments.delete(assessmentId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
  })
})
