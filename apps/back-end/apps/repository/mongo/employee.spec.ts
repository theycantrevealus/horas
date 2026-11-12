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
import { type EmployeeRepository } from '@repository/interface/employee'
import { REPOSITORY_EMPLOYEE } from '@repository/token'
import { EmployeeRepositoryModule } from './employee.module'
import { EmployeeEntity } from './schema/employee'

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
const unitId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const name = {
  use: 'official',
  text: 'dr. Siti Rahma, Sp.PD',
  family: 'Rahma',
  given: ['Siti'],
  prefix: ['dr.'],
  suffix: ['Sp.PD'],
}
const stored = {
  _id: employeeId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  employee_number: 'RS-0001',
  name,
  other_names: [
    { use: 'usual', text: 'Siti', given: [], prefix: [], suffix: [] },
  ],
  display_name: 'dr. Siti Rahma, Sp.PD',
  administrative_gender: {
    system: 'fhir.administrative-gender',
    code: 'female',
  },
  workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
  is_clinical: true,
  profession: { system: 'id.profession', code: 'dokter_spesialis' },
  specialties: [
    {
      coding: { system: 'id.specialty', code: 'penyakit_dalam' },
      is_primary: true,
    },
  ],
  clinical_level: null,
  employment_status: 'active',
  employment_status_since: '2026-01-01',
  current_employment: null,
  primary_assignment: {
    assignment_id: new Types.ObjectId(),
    facility_id: new Types.ObjectId(),
    unit_id: unitId,
    position_id: new Types.ObjectId(),
  },
  original_hire_date: '2025-12-01',
  separation_date: null,
  practitioner_ids: [{ system: 'id.satusehat-ihs', value: 'N100' }],
  work_contacts: [
    {
      system: 'email',
      value: 'siti@rs.id',
      use: 'work',
      is_primary: true,
      verified_at: null,
    },
  ],
  photo: null,
  preferred_language: 'id-ID',
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('EmployeeRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    countDocuments: vi.fn((..._args: unknown[]) => chain(1)),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: employeeId }),
      })),
    ),
  }
  let employees: EmployeeRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_number: 'RS-0002',
    name: {
      use: 'official' as const,
      text: 'Budi',
      given: [],
      prefix: [],
      suffix: [],
    },
    other_names: [],
    display_name: 'Budi',
    administrative_gender: null,
    workforce_category: { system: 'id.workforce-category', code: 'non_klinis' },
    is_clinical: false,
    profession: null,
    specialties: [],
    clinical_level: null,
    employment_status: 'onboarding' as const,
    employment_status_since: '2026-03-01',
    current_employment: null,
    primary_assignment: null,
    original_hire_date: '2026-03-01',
    separation_date: null,
    practitioner_ids: [],
    work_contacts: [],
    photo: null,
    preferred_language: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.countDocuments.mockImplementation(() => chain(1))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: employeeId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, EmployeeRepositoryModule],
    })
      .overrideProvider(
        getModelToken(EmployeeEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    employees = moduleRef.get(REPOSITORY_EMPLOYEE)
  })

  it('maps a stored employee to the model, with names, contacts and summaries, without storage fields', async () => {
    const employee = await employees.findOne(employeeId.toHexString())

    expect(employee).toMatchObject({
      id: employeeId.toHexString(),
      tenant_id: tenantId.toHexString(),
      employee_number: 'RS-0001',
      name: { use: 'official', family: 'Rahma', prefix: ['dr.'] },
      other_names: [{ use: 'usual', text: 'Siti' }],
      administrative_gender: { code: 'female' },
      workforce_category: { code: 'tenaga_medis' },
      specialties: [{ coding: { code: 'penyakit_dalam' }, is_primary: true }],
      clinical_level: null,
      current_employment: null,
      primary_assignment: { unit_id: unitId.toHexString() },
      practitioner_ids: [{ system: 'id.satusehat-ihs', value: 'N100' }],
      work_contacts: [{ system: 'email', value: 'siti@rs.id', use: 'work' }],
      photo: null,
    })
    expect(JSON.stringify(employee)).not.toContain('"_id"')
    expect(JSON.stringify(employee)).not.toContain('__v')
  })

  it('maps a contract summary and a photo reference', async () => {
    const contractId = new Types.ObjectId()
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        current_employment: {
          contract_id: contractId,
          organization_id: new Types.ObjectId(),
          employment_type: { system: 'id.employment-type', code: 'pkwtt' },
          start_date: '2026-01-01',
        },
        photo: { file_id: 'f1', content_type: 'image/png', sha256: 'abc' },
      }),
    )

    const employee = await employees.findOne(employeeId.toHexString())

    expect(employee?.current_employment).toMatchObject({
      contract_id: contractId.toHexString(),
      employment_type: { code: 'pkwtt' },
    })
    expect(employee?.photo).toEqual({
      file_id: 'f1',
      content_type: 'image/png',
      sha256: 'abc',
    })
  })

  it('stamps a created employee with the actor and records one change entry', async () => {
    await asAdmin(() => employees.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'employee' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(employees.create(input)).rejects.toBeInstanceOf(
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

    await expect(asAdmin(() => employees.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('finds by number and by practitioner id, and answers null for a malformed tenant', async () => {
    const byNumber = await employees.findByNumber(
      tenantId.toHexString(),
      'RS-0001',
    )
    const byId = await employees.findByPractitionerId(
      tenantId.toHexString(),
      'id.satusehat-ihs',
      'N100',
    )

    expect(byNumber?.employee_number).toBe('RS-0001')
    expect(byId?.id).toBe(employeeId.toHexString())
    expect(model.findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ employee_number: 'RS-0001', deleted_at: null }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        practitioner_ids: {
          $elemMatch: { system: 'id.satusehat-ihs', value: 'N100' },
        },
      }),
    )
    expect(await employees.findByNumber('x', 'RS-0001')).toBeNull()
    expect(await employees.findByPractitionerId('x', 'a', 'b')).toBeNull()
  })

  it('pages the employees with every filter, escaping text in the regular expressions', async () => {
    const page = await employees.findPage(tenantId.toHexString(), {
      name: 'a.b(c',
      employeeNumber: 'RS-0',
      status: 'active',
      workforceCategoryCode: 'tenaga_medis',
      isClinical: true,
      unitId: unitId.toHexString(),
      limit: 5,
      offset: 5,
    })

    expect(page).toMatchObject({
      totalRecords: 1,
      first: 5,
      rows: 5,
      currentPage: 2,
    })
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: { $regex: 'a\\.b\\(c', $options: 'i' },
        employee_number: { $regex: '^RS-0' },
        employment_status: 'active',
        'workforce_category.code': 'tenaga_medis',
        is_clinical: true,
        'primary_assignment.unit_id': unitId.toHexString(),
        deleted_at: null,
      }),
    )
  })

  it('answers an empty page for a malformed tenant or unit id', async () => {
    expect((await employees.findPage('x', {})).data).toEqual([])
    expect(
      (await employees.findPage(tenantId.toHexString(), { unitId: 'x' }))
        .totalRecords,
    ).toBe(0)
    expect(model.find).not.toHaveBeenCalled()
  })

  it('updates only the editable fields, never the number or the summaries', async () => {
    await asAdmin(() =>
      employees.update(employeeId.toHexString(), {
        preferred_language: 'en',
        employment_status: 'suspended',
        employee_number: 'HACKED',
        current_employment: null,
        primary_assignment: null,
        photo: null,
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('preferred_language', 'en')
    expect(update.$set).toHaveProperty('employment_status', 'suspended')
    for (const forbidden of [
      'employee_number',
      'current_employment',
      'primary_assignment',
      'photo',
    ]) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(chain(null))

    await expect(
      asAdmin(() =>
        employees.update(
          employeeId.toHexString(),
          { preferred_language: 'en' },
          { expectedVersion: 9 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => employees.delete(employeeId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => employees.deleteSoft(employeeId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
