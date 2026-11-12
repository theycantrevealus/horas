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
import { type EmploymentContractRepository } from '@repository/interface/employment-contract'
import { REPOSITORY_EMPLOYMENT_CONTRACT } from '@repository/token'
import { EmploymentContractRepositoryModule } from './employment-contract.module'
import { EmploymentContractEntity } from './schema/employment-contract'

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
const organizationId = new Types.ObjectId()
const contractId = new Types.ObjectId()
const previousId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const stored = {
  _id: contractId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 2,
  employee_id: employeeId,
  organization_id: organizationId,
  contract_number: 'PKWT/2026-001',
  employment_type: { system: 'id.employment-type', code: 'pkwt' },
  period: { start: '2026-01-01', end: '2026-12-31' },
  probation_end_date: null,
  fte: 1,
  working_time_scheme: { system: 'id.working-time-scheme', code: 'shift_40' },
  status: 'draft',
  previous_contract_id: previousId,
  termination: null,
  document: null,
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('EmploymentContractRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: contractId }),
      })),
    ),
  }
  let contracts: EmploymentContractRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    organization_id: organizationId.toHexString(),
    contract_number: 'PKWTT/2026-002',
    employment_type: { system: 'id.employment-type', code: 'pkwtt' },
    period: { start: '2026-02-01', end: null },
    probation_end_date: '2026-05-01',
    fte: 0.5,
    working_time_scheme: null,
    status: 'draft' as const,
    previous_contract_id: null,
    termination: null,
    document: null,
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
            _id: contractId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, EmploymentContractRepositoryModule],
    })
      .overrideProvider(
        getModelToken(EmploymentContractEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .compile()
    contracts = moduleRef.get(REPOSITORY_EMPLOYMENT_CONTRACT)
  })

  it('maps a stored contract to the model without storage fields', async () => {
    const contract = await contracts.findOne(contractId.toHexString())

    expect(contract).toMatchObject({
      id: contractId.toHexString(),
      employee_id: employeeId.toHexString(),
      organization_id: organizationId.toHexString(),
      contract_number: 'PKWT/2026-001',
      employment_type: { code: 'pkwt' },
      period: { start: '2026-01-01', end: '2026-12-31' },
      fte: 1,
      working_time_scheme: { code: 'shift_40' },
      status: 'draft',
      previous_contract_id: previousId.toHexString(),
      termination: null,
      document: null,
    })
    expect(JSON.stringify(contract)).not.toContain('"_id"')
    expect(JSON.stringify(contract)).not.toContain('__v')
  })

  it('maps a termination, a missing renewal link and a missing scheme', async () => {
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        status: 'terminated',
        previous_contract_id: null,
        working_time_scheme: null,
        termination: {
          date: '2026-06-30',
          reason: { system: 'id.termination-reason', code: 'resigned' },
          notes: 'Moved away',
        },
      }),
    )

    const contract = await contracts.findOne(contractId.toHexString())

    expect(contract).toMatchObject({
      previous_contract_id: null,
      working_time_scheme: null,
      termination: {
        date: '2026-06-30',
        reason: { code: 'resigned' },
        notes: 'Moved away',
      },
    })
  })

  it('stamps a created contract with the actor and records one change entry', async () => {
    await asAdmin(() => contracts.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'employment_contract' },
    })
  })

  it('refuses to write without an acting account', async () => {
    await expect(contracts.create(input)).rejects.toBeInstanceOf(
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

    await expect(asAdmin(() => contracts.create(input))).rejects.toBeInstanceOf(
      RepositoryConflictError,
    )
  })

  it('finds by number, the active contract and the renewal, and answers null for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const byNumber = await contracts.findByNumber(
      tenant,
      organizationId.toHexString(),
      'PKWT/2026-001',
    )
    const active = await contracts.findActiveByEmployee(
      tenant,
      employeeId.toHexString(),
    )
    const renewal = await contracts.findRenewal(
      tenant,
      previousId.toHexString(),
    )

    expect(byNumber?.contract_number).toBe('PKWT/2026-001')
    expect(active).not.toBeNull()
    expect(renewal).not.toBeNull()
    expect(model.findOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        contract_number: 'PKWT/2026-001',
        deleted_at: null,
      }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'active', deleted_at: null }),
    )
    expect(model.findOne).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        previous_contract_id: previousId.toHexString(),
      }),
    )
    expect(await contracts.findByNumber('x', 'y', 'n')).toBeNull()
    expect(await contracts.findActiveByEmployee(tenant, 'x')).toBeNull()
    expect(await contracts.findRenewal('x', 'y')).toBeNull()
  })

  it('lists the contracts of an employee, and answers an empty list for malformed ids', async () => {
    const list = await contracts.findByEmployee(
      tenantId.toHexString(),
      employeeId.toHexString(),
    )

    expect(list).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: employeeId.toHexString(),
        deleted_at: null,
      }),
    )
    expect(await contracts.findByEmployee('x', 'y')).toEqual([])
  })

  it('updates only the editable fields, never the employee, employer or number', async () => {
    await asAdmin(() =>
      contracts.update(contractId.toHexString(), {
        status: 'active',
        fte: 0.8,
        employee_id: new Types.ObjectId().toHexString(),
        organization_id: new Types.ObjectId().toHexString(),
        contract_number: 'HACKED',
      } as never),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: Record<string, unknown> },
    ]
    expect(update.$set).toHaveProperty('status', 'active')
    expect(update.$set).toHaveProperty('fte', 0.8)
    for (const forbidden of [
      'employee_id',
      'organization_id',
      'contract_number',
    ]) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('rejects a stale expected version with a conflict', async () => {
    model.findOneAndUpdate.mockReturnValueOnce(chain(null))

    await expect(
      asAdmin(() =>
        contracts.update(
          contractId.toHexString(),
          { status: 'active' },
          { expectedVersion: 9 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('does not support delete or soft delete', async () => {
    await expect(
      asAdmin(() => contracts.delete(contractId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => contracts.deleteSoft(contractId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
