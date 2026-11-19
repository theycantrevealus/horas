import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { findBundle } from '@workforce/concept/bundles'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { LeavePolicyManagementModule } from './leave-policy-management.module'

describe('leave policy endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const sick = { system: 'id.leave-type', code: 'sakit' }
  const pkwtt = { system: 'id.employment-type', code: 'pkwtt' }

  /**
   * Adds a policy version through the API as the writer; the defaults are annual leave of 12 days.
   *
   * @param override - Fields that replace the defaults.
   * @returns The reply.
   */
  function add(override: object = {}) {
    return call('POST', '/v1/leave-policies', writerToken, {
      leaveType: annual,
      effectiveFrom: '2099-01-01',
      balance: {
        kind: 'period',
        period: 'service_year',
        days: 12,
        minServiceMonths: 12,
        carryOver: null,
        deductCollectiveLeave: false,
      },
      counting: 'working_days',
      halfDays: true,
      paid: true,
      employmentTypes: [pkwtt],
      approval: { steps: 'one_step', twoStepAboveDays: null },
      noticeDays: 0,
      retroactiveDays: 0,
      maxDaysPerRequest: 12,
      proof: null,
      notes: null,
      ...override,
    })
  }

  /**
   * Captures every entry the application writes through Nest's logger.
   *
   * @returns The entries and a function that restores the logger.
   */
  function captureLogs(): {
    written: Record<string, unknown>[]
    restore: () => void
  } {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [LeavePolicyManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_LEAVE_POLICY_READ,
      PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_LEAVE_POLICY_READ,
    ])
    otherTenantToken = await gateway.seedAndLogin(gateway.otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_LEAVE_POLICY_READ,
      PERMISSIONS.WORKFORCE_LEAVE_POLICY_WRITE,
    ])
    const wanted = (findBundle('id') ?? []).filter(
      (concept) =>
        concept.system === 'id.leave-type' ||
        concept.system === 'id.employment-type',
    )
    for (const concept of wanted) {
      await workforce.codeConcepts.create({
        system: concept.system,
        code: concept.code,
        display: concept.display,
        properties: concept.properties,
        mappings: [],
        period: null,
        status: 'active',
      })
    }
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and the writes without the write permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', '/v1/leave-policies', undefined],
      ['POST', '/v1/leave-policies', {}],
      ['PATCH', `/v1/leave-policies/${id}`, {}],
      ['POST', '/v1/leave-policies/import', {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', '/v1/leave-policies', readerToken)).status).toBe(200)
  })

  it('adds a version, lists it with filters, and edits it before it starts', async () => {
    const created = await add({ notes: 'PKB art. 9', reason: 'Baru' })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      tenant_id: tenantId,
      leave_type: annual,
      effective_from: '2099-01-01',
      balance: { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null },
      counting: 'working_days',
      half_days: true,
      paid: true,
      employment_types: [pkwtt],
      approval: { steps: 'one_step', two_step_above_days: null },
      proof: null,
      notes: 'PKB art. 9',
      source: { kind: 'manual', bundle_id: null },
    })
    expect(body).not.toHaveProperty('_id')
    await add({ leaveType: sick, effectiveFrom: '2099-02-01', balance: { kind: 'none' }, maxDaysPerRequest: 30, proof: { dueDays: 3 }, retroactiveDays: 3 })
    await add({ effectiveFrom: '2100-01-01' })

    const byType = await call('GET', '/v1/leave-policies?leaveTypeSystem=id.leave-type&leaveTypeCode=tahunan', readerToken)
    expect((byType.body as any[]).map((item) => item.effective_from)).toEqual(['2100-01-01', '2099-01-01'])
    const onDate = await call('GET', '/v1/leave-policies?onDate=2099-06-01', readerToken)
    expect((onDate.body as any[]).map((item) => `${item.leave_type.code}@${item.effective_from}`)).toEqual([
      'sakit@2099-02-01',
      'tahunan@2099-01-01',
    ])

    const edited = await call('PATCH', `/v1/leave-policies/${body.id}`, writerToken, {
      paid: false,
      proof: { dueDays: 5 },
      notes: null,
      version: body.version,
    })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      paid: false,
      proof: { due_days: 5 },
      notes: null,
      counting: 'working_days',
      leave_type: annual,
      effective_from: '2099-01-01',
    })
  })

  it('imports the Indonesian bundle for one tenant, and a second import creates nothing', async () => {
    const first = await call('POST', '/v1/leave-policies/import', otherTenantToken, { bundle: 'id', effectiveFrom: '2099-06-01' })
    const second = await call('POST', '/v1/leave-policies/import', otherTenantToken, { bundle: 'id', effectiveFrom: '2099-06-01' })

    expect(first.status).toBe(201)
    expect(first.body).toEqual({ created: 13, skipped: 0 })
    expect(second.body).toEqual({ created: 0, skipped: 13 })
    const theirs = await call('GET', '/v1/leave-policies?limit=100', otherTenantToken)
    expect(theirs.body as any[]).toHaveLength(13)
    expect((theirs.body as any[]).every((item) => item.source.kind === 'bundle')).toBe(true)
    const ours = await call('GET', '/v1/leave-policies?limit=100', readerToken)
    expect((ours.body as any[]).every((item) => item.tenant_id === tenantId)).toBe(true)
    expect((await call('POST', '/v1/leave-policies/import', otherTenantToken, { bundle: 'xx', effectiveFrom: '2099-06-01' })).body).toMatchObject({ code: 'unknown_bundle' })
  })

  it('answers 404 for a missing, malformed or foreign policy', async () => {
    const created = (await add({ effectiveFrom: '2101-01-01' })).body as Record<string, any>
    const unknown = new Types.ObjectId().toHexString()

    for (const id of [unknown, 'bad']) {
      const reply = await call('PATCH', `/v1/leave-policies/${id}`, writerToken, { paid: false })
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'leave_policy_not_found' })
    }
    expect((await call('PATCH', `/v1/leave-policies/${created.id}`, otherTenantToken, { paid: false })).status).toBe(404)
  })

  it('answers 409 for a repeated start date and a stale version, and 422 for the business rules', async () => {
    const created = (await add({ effectiveFrom: '2102-01-01' })).body as Record<string, any>

    const again = await add({ effectiveFrom: '2102-01-01' })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'policy_exists' })
    const stale = await call('PATCH', `/v1/leave-policies/${created.id}`, writerToken, { paid: false, version: created.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    const code = async (override: object) => (await add({ effectiveFrom: '2103-01-01', ...override })).body
    expect(await code({ leaveType: { system: 'id.profession', code: 'perawat' } })).toMatchObject({ code: 'invalid_leave_type' })
    expect(await code({ leaveType: { system: 'id.leave-type', code: 'tidak_ada' } })).toMatchObject({ code: 'unknown_code' })
    expect(await code({ effectiveFrom: '2020-01-01' })).toMatchObject({ code: 'effective_in_past' })
    expect(await code({ balance: { kind: 'per_event', days: 3, carryOver: null } })).toMatchObject({ code: 'invalid_balance' })
    expect(await code({ maxDaysPerRequest: 400 })).toMatchObject({ code: 'invalid_max_days' })
    expect(await code({ approval: { steps: 'two_step', twoStepAboveDays: 5 } })).toMatchObject({ code: 'invalid_approval' })
    expect(await code({ employmentTypes: [{ system: 'id.profession', code: 'perawat' }] })).toMatchObject({ code: 'invalid_employment_type' })
    expect((await call('PATCH', `/v1/leave-policies/${created.id}`, writerToken, {})).body).toMatchObject({ code: 'empty_update' })

    const started = await workforce.leavePolicies.create({
      tenant_id: tenantId,
      leave_type: sick,
      effective_from: '2020-01-01',
      balance: { kind: 'none' },
      counting: 'working_days',
      half_days: false,
      paid: true,
      employment_types: [],
      approval: { steps: 'one_step', two_step_above_days: null },
      notice_days: 0,
      retroactive_days: 0,
      max_days_per_request: 366,
      proof: null,
      notes: null,
      source: { kind: 'manual', bundle_id: null },
    })
    const inForce = await call('PATCH', `/v1/leave-policies/${started.id}`, writerToken, { paid: false })
    expect(inForce.status).toBe(422)
    expect(inForce.body).toMatchObject({ code: 'policy_in_force' })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    expect((await call('POST', '/v1/leave-policies', writerToken, {})).status).toBe(400)
    expect((await add({ leaveType: 'tahunan' })).status).toBe(400)
    expect((await add({ effectiveFrom: '2099-02-30' })).status).toBe(400)
    expect((await add({ balance: { kind: 'forever' } })).status).toBe(400)
    expect((await add({ balance: {} })).status).toBe(400)
    expect((await add({ counting: 'fortnights' })).status).toBe(400)
    expect((await add({ halfDays: 'yes' })).status).toBe(400)
    expect((await add({ paid: undefined })).status).toBe(400)
    expect((await add({ maxDaysPerRequest: 'many' })).status).toBe(400)
    expect((await add({ approval: { steps: 'three_step' } })).status).toBe(400)
    expect((await add({ employmentTypes: 'pkwtt' })).status).toBe(400)
    expect((await add({ proof: { dueDays: 'soon' } })).status).toBe(400)
    const id = new Types.ObjectId().toHexString()
    expect((await call('PATCH', `/v1/leave-policies/${id}`, writerToken, { version: -1 })).status).toBe(400)
    expect((await call('PATCH', `/v1/leave-policies/${id}`, writerToken, { balance: { kind: 'forever' } })).status).toBe(400)
    expect((await call('POST', '/v1/leave-policies/import', writerToken, { bundle: 'id' })).status).toBe(400)
    expect((await call('POST', '/v1/leave-policies/import', writerToken, { effectiveFrom: '2099-01-01' })).status).toBe(400)
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'onDate=2099-02-30', 'onDate=soon']) {
      expect((await call('GET', `/v1/leave-policies?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', '/v1/leave-policies', readerToken),
        await call('GET', '/v1/leave-policies?onDate=2099-06-01', readerToken),
        await call('GET', '/v1/leave-policies?limit=0', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 400])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without codes, counts, dates, notes or reasons', async () => {
    const { written, restore } = captureLogs()
    try {
      const created = (await add({ effectiveFrom: '2110-01-01', maxDaysPerRequest: 11, notes: 'Catatan Rahasia', reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('PATCH', `/v1/leave-policies/${created.id}`, writerToken, { notes: 'Catatan Ubah Rahasia', reason: 'Alasan Ubah Rahasia' })
      await call('POST', '/v1/leave-policies/import', otherTenantToken, { bundle: 'id', effectiveFrom: '2110-01-01', reason: 'Alasan Impor Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'leave_policy_create',
        'leave_policy_update',
        'leave_policy_import',
      ])
      for (const text of ['tahunan', 'pkwtt', '2110-01-01', 'Catatan Rahasia', 'Catatan Ubah Rahasia', 'Alasan Rahasia', 'Alasan Ubah Rahasia', 'Alasan Impor Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
