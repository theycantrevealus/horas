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
import { type SeparationRepository } from '@repository/interface/separation'
import { REPOSITORY_SEPARATION } from '@repository/token'
import { SeparationRepositoryModule } from './separation.module'
import { SeparationEntity, SeparationSchema } from './schema/separation'

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
    sort: vi.fn(() => self),
    skip: () => self,
    limit: vi.fn(() => self),
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const separationId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const resignation = { system: 'id.separation-type', code: 'resignation' }
const stored = {
  _id: separationId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  employee_id: employeeId,
  facility_id: facilityId,
  type: resignation,
  contract_action: 'end',
  last_working_day: '2026-12-31',
  notice_received_on: '2026-11-20',
  immediate: false,
  status: 'planned',
  status_since: new Date('2026-11-23T05:00:00Z'),
  completion: null,
  checklist: [{ item: { system: 'id.exit-checklist-item', code: 'keys' }, done: null }],
  settlement: null,
  created_by: actor,
  created_at: new Date('2026-11-23T05:00:00Z'),
  updated_at: new Date('2026-11-23T05:00:00Z'),
  deleted_at: null,
}

describe('SeparationRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: separationId }),
      })),
    ),
  }
  let separations: SeparationRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    facility_id: facilityId.toHexString(),
    type: resignation,
    contract_action: 'end' as const,
    last_working_day: '2026-12-31',
    notice_received_on: '2026-11-20',
    immediate: false,
    status: 'planned' as const,
    status_since: new Date('2026-11-23T05:00:00Z'),
    completion: null,
    checklist: [{ item: { system: 'id.exit-checklist-item', code: 'keys' }, done: null }],
    settlement: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain({ ...stored, status: 'cancelled' }))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({ toObject: () => ({ ...stored, ...castIds(document), _id: separationId }) })),
    )
    const moduleRef = await Test.createTestingModule({ imports: [FakeConnectionModule, SeparationRepositoryModule] })
      .overrideProvider(getModelToken(SeparationEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    separations = moduleRef.get(REPOSITORY_SEPARATION)
  })

  it('pins the collection name separations and declares its indexes, the job index without a tenant', () => {
    expect(SeparationSchema.get('collection')).toBe('separations')
    const indexes = SeparationSchema.indexes()
    expect(indexes).toContainEqual([
      { tenant_id: 1, employee_id: 1 },
      expect.objectContaining({ unique: true, partialFilterExpression: { status: { $in: ['planned', 'completed'] } } }),
    ])
    expect(indexes).toContainEqual([{ tenant_id: 1, status: 1, last_working_day: 1 }, expect.anything()])
    expect(indexes).toContainEqual([{ status: 1, last_working_day: 1 }, expect.anything()])
  })

  it('maps a stored separation to the model without storage fields, identifiers as strings', async () => {
    const found = await separations.findOne(separationId.toHexString())

    expect(found).toMatchObject({
      id: separationId.toHexString(),
      tenant_id: tenantId.toHexString(),
      employee_id: employeeId.toHexString(),
      facility_id: facilityId.toHexString(),
      type: resignation,
      contract_action: 'end',
      last_working_day: '2026-12-31',
      notice_received_on: '2026-11-20',
      immediate: false,
      status: 'planned',
      completion: null,
      checklist: [{ item: { system: 'id.exit-checklist-item', code: 'keys' }, done: null }],
      settlement: null,
    })
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps a completion, a done checklist item, a settlement and a missing facility', async () => {
    const at = new Date('2027-01-01T01:00:00Z')
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        facility_id: null,
        status: 'completed',
        completion: { at, by: actor, counts: { assignments: 4, sessions: 2, leave_requests: 1, appointments: 1, memberships: 0, position_assignments: 1 } },
        checklist: [{ item: { system: 'id.exit-checklist-item', code: 'keys' }, done: { by: actor, at } }],
        settlement: { leave: [{ leave_type: { system: 'id.leave-type', code: 'tahunan' }, period: { start: '2026-03-15', end: '2027-03-14' }, days_left: -1.5 }], notes: null },
      }),
    )

    const found = await separations.findOne(separationId.toHexString())

    expect(found).toMatchObject({
      facility_id: null,
      status: 'completed',
      completion: { at, counts: { assignments: 4, sessions: 2, leave_requests: 1, appointments: 1, memberships: 0, position_assignments: 1 } },
      checklist: [{ done: { by: actor, at } }],
      settlement: { leave: [{ days_left: -1.5, period: { start: '2026-03-15', end: '2027-03-14' } }], notes: null },
    })
  })

  it('records one change entry of type separation with the settlement masked as confidential', async () => {
    await asAdmin(() => separations.create(input))

    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'separation' } })
    expect(JSON.stringify(appended[0])).not.toContain('Pindah')
  })

  it('lists with its filters, latest last working day first, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    await separations.findByFilter(tenant, { status: 'planned', typeCode: 'resignation', facilityId: facilityId.toHexString(), employeeIds: [employeeId.toHexString()], from: '2026-12-01', to: '2026-12-31', limit: 5 })

    expect(model.find).toHaveBeenCalledWith({
      tenant_id: tenant,
      deleted_at: null,
      status: 'planned',
      'type.code': 'resignation',
      facility_id: facilityId.toHexString(),
      employee_id: { $in: [employeeId.toHexString()] },
      last_working_day: { $gte: '2026-12-01', $lte: '2026-12-31' },
    })
    expect(query.sort).toHaveBeenCalledWith({ last_working_day: -1, _id: -1 })
    expect(query.limit).toHaveBeenCalledWith(5)
    model.find.mockClear()
    expect(await separations.findByFilter('x')).toEqual([])
    expect(await separations.findByFilter(tenant, { facilityId: 'bad' })).toEqual([])
    expect(await separations.findByFilter(tenant, { employeeIds: ['bad'] })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the separation of an employee that is not cancelled, and nothing for malformed ids', async () => {
    const tenant = tenantId.toHexString()

    expect(await separations.findOpenByEmployee(tenant, employeeId.toHexString())).toMatchObject({ employee_id: employeeId.toHexString() })
    expect(model.find).toHaveBeenCalledWith({ tenant_id: tenant, employee_id: employeeId.toHexString(), status: { $in: ['planned', 'completed'] }, deleted_at: null })
    model.find.mockReturnValueOnce(chain([]))
    expect(await separations.findOpenByEmployee(tenant, employeeId.toHexString())).toBeNull()
    expect(await separations.findOpenByEmployee('x', employeeId.toHexString())).toBeNull()
    expect(await separations.findOpenByEmployee(tenant, 'bad')).toBeNull()
  })

  it('updates only the fields a separation may change', async () => {
    await asAdmin(() =>
      separations.update(separationId.toHexString(), { status: 'cancelled', employee_id: new Types.ObjectId().toHexString(), immediate: true }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toContain('status')
    for (const forbidden of ['employee_id', 'immediate', 'facility_id']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('has no delete and refuses to write without an acting account', async () => {
    await expect(separations.create(input)).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => separations.delete(separationId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => separations.deleteSoft(separationId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })
})
