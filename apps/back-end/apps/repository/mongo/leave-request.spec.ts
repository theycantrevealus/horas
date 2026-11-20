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
import { type LeaveRequestRepository } from '@repository/interface/leave-request'
import { REPOSITORY_LEAVE_REQUEST } from '@repository/token'
import { LeaveRequestRepositoryModule } from './leave-request.module'
import { LeaveRequestEntity, LeaveRequestSchema } from './schema/leave-request'

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
const unitId = new Types.ObjectId()
const facilityId = new Types.ObjectId()
const policyId = new Types.ObjectId()
const requestId = new Types.ObjectId()
const headId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const annual = { system: 'id.leave-type', code: 'tahunan' }
const stored = {
  _id: requestId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  employee_id: employeeId,
  unit_id: unitId,
  facility_id: facilityId,
  leave_type: annual,
  policy_id: policyId,
  rules: { balance_kind: 'period', counting: 'working_days', steps: 'one_step' },
  period: { start: '2027-03-01', end: '2027-03-03' },
  half_days: { first: false, last: true },
  days: [
    { date: '2027-03-01', count: 1, why: 'working', set_by: 'roster' },
    { date: '2027-03-02', count: 1, why: 'working', set_by: 'working_week' },
    { date: '2027-03-03', count: 0.5, why: 'working', set_by: 'working_week' },
  ],
  total_days: 2.5,
  entitlement_period: { start: '2026-03-15', end: '2027-03-14' },
  deciders: { first: { kind: 'unit_head', unit_id: unitId, employee_id: null }, second: false },
  replacement: null,
  decisions: [],
  status: 'requested',
  status_since: new Date('2026-11-19T05:00:00Z'),
  proof_due_on: '2027-03-04',
  proof_received: false,
  cover: null,
  created_by: actor,
  created_at: new Date('2026-11-19T05:00:00Z'),
  updated_at: new Date('2026-11-19T05:00:00Z'),
  deleted_at: null,
}

describe('LeaveRequestRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    find: vi.fn((..._args: unknown[]) => chain([stored])),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), deciders: stored.deciders, _id: requestId }),
      })),
    ),
  }
  let requests: LeaveRequestRepository

  const input = {
    tenant_id: tenantId.toHexString(),
    employee_id: employeeId.toHexString(),
    unit_id: unitId.toHexString(),
    facility_id: facilityId.toHexString(),
    leave_type: annual,
    policy_id: policyId.toHexString(),
    rules: { balance_kind: 'period' as const, counting: 'working_days' as const, steps: 'one_step' as const },
    period: { start: '2027-03-01', end: '2027-03-03' },
    half_days: { first: false, last: true },
    days: [{ date: '2027-03-01', count: 1 as const, why: 'working' as const, set_by: 'roster' as const }],
    total_days: 1,
    entitlement_period: { start: '2026-03-15', end: '2027-03-14' },
    deciders: { first: { kind: 'unit_head' as const, unit_id: unitId.toHexString(), employee_id: null }, second: false },
    replacement: null,
    decisions: [],
    status: 'requested' as const,
    status_since: new Date('2026-11-19T05:00:00Z'),
    proof_due_on: null,
    proof_received: false,
    cover: null,
  }

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.find.mockImplementation(() => chain([stored]))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({ toObject: () => ({ ...stored, ...castIds(document), deciders: stored.deciders, _id: requestId }) })),
    )
    const moduleRef = await Test.createTestingModule({ imports: [FakeConnectionModule, LeaveRequestRepositoryModule] })
      .overrideProvider(getModelToken(LeaveRequestEntity.name, MONGO_MAIN_CONNECTION))
      .useValue(model)
      .compile()
    requests = moduleRef.get(REPOSITORY_LEAVE_REQUEST)
  })

  it('pins the collection name leave_requests', () => {
    expect(LeaveRequestSchema.get('collection')).toBe('leave_requests')
  })

  it('declares the four indexes of the collection design, the proof one only for requests without proof', () => {
    const indexes = LeaveRequestSchema.indexes()

    expect(indexes).toContainEqual([{ tenant_id: 1, employee_id: 1, 'period.start': 1 }, expect.anything()])
    expect(indexes).toContainEqual([{ tenant_id: 1, 'deciders.first.unit_id': 1, status: 1 }, expect.anything()])
    expect(indexes).toContainEqual([{ tenant_id: 1, status: 1, created_at: 1 }, expect.anything()])
    expect(indexes).toContainEqual([
      { tenant_id: 1, status: 1, proof_due_on: 1 },
      expect.objectContaining({ partialFilterExpression: { proof_received: false } }),
    ])
  })

  it('maps a stored request to the model without storage fields, identifiers as strings', async () => {
    const found = await requests.findOne(requestId.toHexString())

    expect(found).toMatchObject({
      id: requestId.toHexString(),
      tenant_id: tenantId.toHexString(),
      employee_id: employeeId.toHexString(),
      unit_id: unitId.toHexString(),
      facility_id: facilityId.toHexString(),
      leave_type: annual,
      policy_id: policyId.toHexString(),
      rules: { balance_kind: 'period', counting: 'working_days', steps: 'one_step' },
      period: { start: '2027-03-01', end: '2027-03-03' },
      half_days: { first: false, last: true },
      total_days: 2.5,
      entitlement_period: { start: '2026-03-15', end: '2027-03-14' },
      deciders: { first: { kind: 'unit_head', unit_id: unitId.toHexString(), employee_id: null }, second: false },
      replacement: null,
      decisions: [],
      status: 'requested',
      proof_due_on: '2027-03-04',
      proof_received: false,
      cover: null,
    })
    expect((found?.days ?? []).map((day) => [day.date, day.count, day.why, day.set_by])).toEqual([
      ['2027-03-01', 1, 'working', 'roster'],
      ['2027-03-02', 1, 'working', 'working_week'],
      ['2027-03-03', 0.5, 'working', 'working_week'],
    ])
    expect(JSON.stringify(found)).not.toContain('"_id"')
    expect(JSON.stringify(found)).not.toContain('__v')
  })

  it('maps decisions, a replacement, a resolved Head and a confirmed cover', async () => {
    const replacementId = new Types.ObjectId()
    const assignmentId = new Types.ObjectId()
    const at = new Date('2026-11-20T01:00:00Z')
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        status: 'approved',
        deciders: { first: { kind: 'unit_head', unit_id: unitId, employee_id: headId }, second: false },
        replacement: { employee_id: replacementId, none_reason: null },
        decisions: [{ step: 'first', outcome: 'approved', by: actor, at, reason: null }],
        cover: { cancelled_assignment_ids: [assignmentId], confirmed: { by: actor, at, created_assignment_ids: [assignmentId] } },
      }),
    )

    expect(await requests.findOne(requestId.toHexString())).toMatchObject({
      deciders: { first: { employee_id: headId.toHexString() } },
      replacement: { employee_id: replacementId.toHexString(), none_reason: null },
      decisions: [{ step: 'first', outcome: 'approved', at, reason: null }],
      cover: { cancelled_assignment_ids: [assignmentId.toHexString()], confirmed: { created_assignment_ids: [assignmentId.toHexString()] } },
    })
  })

  it('maps a request without a unit and a facility', async () => {
    model.findOne.mockReturnValueOnce(chain({ ...stored, unit_id: null, facility_id: null, entitlement_period: null, deciders: { first: { kind: 'hr_manager', unit_id: null, employee_id: null }, second: true } }))

    expect(await requests.findOne(requestId.toHexString())).toMatchObject({ unit_id: null, facility_id: null, entitlement_period: null, deciders: { first: { kind: 'hr_manager', unit_id: null }, second: true } })
  })

  it('stamps a created request with the actor and records one change entry of type leave_request', async () => {
    await asAdmin(() => requests.create(input))

    expect(model.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: expect.objectContaining({ account_id: 'a1' }), schema_version: 1 }),
    ])
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({ action: 'create', entity: { type: 'leave_request' } })
  })

  it('refuses to write without an acting account, and has no delete', async () => {
    await expect(requests.create(input)).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => requests.delete(requestId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
    await expect(asAdmin(() => requests.deleteSoft(requestId.toHexString()))).rejects.toBeInstanceOf(RepositoryError)
  })

  it('updates only the editable fields, never the employee, unit, facility or creator', async () => {
    await asAdmin(() =>
      requests.update(requestId.toHexString(), {
        status: 'approved',
        status_since: new Date(),
        total_days: 2,
        proof_received: true,
        employee_id: new Types.ObjectId().toHexString(),
        unit_id: new Types.ObjectId().toHexString(),
        facility_id: new Types.ObjectId().toHexString(),
      }),
    )

    const update = model.findOneAndUpdate.mock.calls[0]?.[1] as { $set: Record<string, unknown> }
    expect(Object.keys(update.$set)).toEqual(expect.arrayContaining(['status', 'status_since', 'total_days', 'proof_received']))
    for (const forbidden of ['employee_id', 'unit_id', 'facility_id', 'created_by']) {
      expect(update.$set).not.toHaveProperty(forbidden)
    }
  })

  it('lists with its filters, oldest start last, and answers an empty list for malformed ids', async () => {
    const tenant = tenantId.toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    await requests.findByFilter(tenant, {
      employeeId: employeeId.toHexString(),
      unitId: unitId.toHexString(),
      status: 'requested',
      from: '2027-03-01',
      to: '2027-03-31',
      proofOverdueBefore: '2027-03-10',
      limit: 5,
      offset: 5,
    })

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employeeId.toHexString(),
        unit_id: unitId.toHexString(),
        status: 'requested',
        'period.start': { $lte: '2027-03-31' },
        'period.end': { $gte: '2027-03-01' },
        proof_received: false,
        proof_due_on: { $lt: '2027-03-10', $ne: null },
        deleted_at: null,
      }),
    )
    expect(query.sort).toHaveBeenCalledWith({ created_at: -1, _id: -1 })
    model.find.mockClear()
    expect(await requests.findByFilter('x')).toEqual([])
    expect(await requests.findByFilter(tenant, { employeeId: 'bad' })).toEqual([])
    expect(await requests.findByFilter(tenant, { unitId: 'bad' })).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the requests that share a date with a range, for the given statuses', async () => {
    const tenant = tenantId.toHexString()

    const found = await requests.findOverlapping(tenant, employeeId.toHexString(), '2027-03-02', '2027-03-05', ['requested', 'head_approved', 'approved'])

    expect(found).toHaveLength(1)
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employeeId.toHexString(),
        status: { $in: ['requested', 'head_approved', 'approved'] },
        'period.start': { $lte: '2027-03-05' },
        'period.end': { $gte: '2027-03-02' },
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await requests.findOverlapping('x', employeeId.toHexString(), '2027-03-02', '2027-03-05', ['approved'])).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the pending requests of one employee, leave type and entitlement period', async () => {
    const tenant = tenantId.toHexString()

    await requests.findPendingByEmployeeTypeAndPeriod(tenant, employeeId.toHexString(), annual, '2026-03-15')

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenant,
        employee_id: employeeId.toHexString(),
        'leave_type.system': 'id.leave-type',
        'leave_type.code': 'tahunan',
        'entitlement_period.start': '2026-03-15',
        status: { $in: ['requested', 'head_approved'] },
        deleted_at: null,
      }),
    )
    model.find.mockClear()
    expect(await requests.findPendingByEmployeeTypeAndPeriod('x', employeeId.toHexString(), annual, '2026-03-15')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('tells whether a request was made under a policy version, without reading for a malformed identifier', async () => {
    const tenant = tenantId.toHexString()
    const policy = new Types.ObjectId().toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    expect(await requests.findAnyByPolicy(tenant, policy)).toBe(true)

    expect(model.find).toHaveBeenCalledWith({ tenant_id: tenant, policy_id: policy, deleted_at: null })
    expect(query.limit).toHaveBeenCalledWith(1)
    model.find.mockReturnValueOnce(chain([]))
    expect(await requests.findAnyByPolicy(tenant, policy)).toBe(false)
    model.find.mockClear()
    expect(await requests.findAnyByPolicy(tenant, 'bad')).toBe(false)
    expect(model.find).not.toHaveBeenCalled()
    expect(LeaveRequestSchema.indexes()).toContainEqual([{ tenant_id: 1, policy_id: 1 }, expect.anything()])
  })

  it('finds the approved requests of an employee that hold a date, and nothing for malformed identifiers', async () => {
    const tenant = tenantId.toHexString()

    await requests.findApprovedCovering(tenant, employeeId.toHexString(), '2026-12-01')

    expect(model.find).toHaveBeenCalledWith({
      tenant_id: tenant,
      employee_id: employeeId.toHexString(),
      status: 'approved',
      'period.start': { $lte: '2026-12-01' },
      'period.end': { $gte: '2026-12-01' },
      deleted_at: null,
    })
    model.find.mockClear()
    expect(await requests.findApprovedCovering('x', employeeId.toHexString(), '2026-12-01')).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
  })

  it('finds the requests waiting for a Head of some units and for HR Manager, and nothing for neither', async () => {
    const tenant = tenantId.toHexString()
    const query = chain([stored])
    model.find.mockReturnValueOnce(query)

    await requests.findWaiting(tenant, { unitIds: [unitId.toHexString()], hr: true }, 10, 20)

    expect(model.find).toHaveBeenCalledWith({
      tenant_id: tenant,
      deleted_at: null,
      $or: [
        { status: 'requested', 'deciders.first.kind': { $in: ['unit_head', 'parent_head'] }, 'deciders.first.unit_id': { $in: [unitId.toHexString()] } },
        { status: 'requested', 'deciders.first.kind': 'hr_manager' },
        { status: 'head_approved' },
      ],
    })
    expect(query.sort).toHaveBeenCalledWith({ created_at: -1, _id: -1 })
    model.find.mockClear()
    expect(await requests.findWaiting(tenant, { unitIds: [], hr: false }, 10, 0)).toEqual([])
    expect(await requests.findWaiting(tenant, { unitIds: ['bad'], hr: false }, 10, 0)).toEqual([])
    expect(model.find).not.toHaveBeenCalled()
    await requests.findWaiting(tenant, { unitIds: [], hr: true }, 10, 0)
    const lastFilter = model.find.mock.calls[0]?.[0] as { $or: unknown[] } | undefined
    expect(lastFilter?.$or).toHaveLength(2)
  })
})
