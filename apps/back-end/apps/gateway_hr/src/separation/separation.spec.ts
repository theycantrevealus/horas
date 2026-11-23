import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { addDays } from '@workforce/assignment/assignment-rules'
import { todayUtc } from '@utility/validation/local-date'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { SeparationManagementModule } from './separation-management.module'

describe('separation endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let readerToken: string
  let writerToken: string
  let detailsToken: string
  let completerToken: string
  let otherTenantToken: string
  const resignation = { system: 'id.separation-type', code: 'resignation' }
  const dismissal = { system: 'id.separation-type', code: 'dismissal' }
  const lastDay = addDays(todayUtc(), 30)

  /**
   * Adds an active employee.
   *
   * @param tenant - Tenant of the record.
   * @returns The employee identifier.
   */
  async function addEmployee(tenant: string): Promise<string> {
    const employee = await workforce.employees.create({
      tenant_id: tenant,
      employee_number: `E${new Types.ObjectId().toHexString().slice(-6)}`,
      name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
      other_names: [],
      display_name: 'Siti',
      administrative_gender: null,
      workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
      is_clinical: false,
      profession: null,
      specialties: [],
      clinical_level: null,
      employment_status: 'active',
      employment_status_since: '2024-03-15',
      current_employment: null,
      primary_assignment: null,
      original_hire_date: '2024-03-15',
      separation_date: null,
      practitioner_ids: [],
      work_contacts: [],
      photo: null,
      preferred_language: null,
    })
    return employee.id
  }

  /**
   * Captures every entry the application writes through Nest's logger.
   *
   * @returns The entries and a function that restores the logger.
   */
  function captureLogs(): { written: Record<string, unknown>[]; restore: () => void } {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation((entry: unknown) => {
        if (typeof entry === 'object' && entry !== null) {
          written.push(entry as Record<string, unknown>)
        }
      }),
    )
    return { written, restore: () => spies.forEach((spy) => spy.mockRestore()) }
  }

  /**
   * A valid body.
   *
   * @param override - Fields to replace.
   * @returns The body.
   */
  function body(override: object = {}) {
    return { type: resignation, lastWorkingDay: lastDay, noticeReceivedOn: todayUtc(), reason: 'Pindah ke kota lain', ...override }
  }

  /**
   * Records a separation for a new employee.
   *
   * @returns The separation and the employee.
   */
  async function record(override: object = {}): Promise<{ id: string; version: number; employee: string }> {
    const employee = await addEmployee(tenantId)
    const reply = await call('POST', `/v1/employees/${employee}/separations`, writerToken, body(override))
    expect(reply.status).toBe(201)
    return { ...(reply.body as { id: string; version: number }), employee }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [SeparationManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_SEPARATION_READ])
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [PERMISSIONS.WORKFORCE_SEPARATION_WRITE, PERMISSIONS.WORKFORCE_SEPARATION_READ])
    detailsToken = await gateway.seedAndLogin(tenantId, 'details', [PERMISSIONS.WORKFORCE_SEPARATION_READ_DETAILS])
    completerToken = await gateway.seedAndLogin(tenantId, 'completer', [PERMISSIONS.WORKFORCE_SEPARATION_WRITE, PERMISSIONS.WORKFORCE_SEPARATION_COMPLETE])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [PERMISSIONS.WORKFORCE_SEPARATION_READ, PERMISSIONS.WORKFORCE_SEPARATION_WRITE, PERMISSIONS.WORKFORCE_SEPARATION_READ_DETAILS])
    for (const [system, code, properties] of [
      ['id.separation-type', 'resignation', { contract_action: 'end' }],
      ['id.separation-type', 'dismissal', { contract_action: 'terminate' }],
      ['id.exit-checklist-item', 'keys', {}],
    ] as const) {
      await workforce.codeConcepts.create({ system, code, display: [{ locale: 'en', text: code }], properties, mappings: [], period: null, status: 'active' })
    }
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and each route without its permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH' | 'PUT', string, string][] = [
      ['POST', `/v1/employees/${id}/separations`, 'write'],
      ['GET', '/v1/separations', 'read'],
      ['GET', `/v1/separations/${id}`, 'read'],
      ['GET', `/v1/separations/${id}/details`, 'details'],
      ['GET', `/v1/separations/${id}/impact`, 'read'],
      ['PATCH', `/v1/separations/${id}`, 'write'],
      ['POST', `/v1/separations/${id}/cancel`, 'write'],
      ['PUT', `/v1/separations/${id}/checklist/id.exit-checklist-item/keys`, 'write'],
      ['POST', `/v1/separations/${id}/complete`, 'complete'],
    ]
    for (const [method, url] of routes) {
      expect((await call(method, url, undefined, {})).status).toBe(401)
    }
    for (const [method, url, need] of routes) {
      const token = need === 'write' || need === 'details' || need === 'complete' ? readerToken : detailsToken
      expect((await call(method, url, token, {})).status).toBe(403)
    }
  })

  it('records a separation without its reason in the answer or the logs, with the checklist', async () => {
    const employee = await addEmployee(tenantId)
    const logs = captureLogs()
    const reply = await call('POST', `/v1/employees/${employee}/separations`, writerToken, body())
    logs.restore()

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({ employee_id: employee, tenant_id: tenantId, type: resignation, contract_action: 'end', last_working_day: lastDay, status: 'planned', immediate: false, checklist: [{ item: { code: 'keys' }, done: null }] })
    expect(JSON.stringify(reply.body)).not.toContain('Pindah')
    expect(JSON.stringify(reply.body)).not.toContain('"_id"')
    expect(JSON.stringify(logs.written)).toContain('separation_create')
    expect(JSON.stringify(logs.written)).not.toContain('Pindah')
    expect(JSON.stringify(logs.written)).not.toContain(lastDay)
  })

  it('refuses a second separation (409), a bad body (400), a bad rule (422) and an unknown or foreign employee (404)', async () => {
    const first = await record()
    const foreign = await addEmployee(otherTenantId)

    const again = await call('POST', `/v1/employees/${first.employee}/separations`, writerToken, body())
    const invalid = await call('POST', `/v1/employees/${first.employee}/separations`, writerToken, { ...body(), lastWorkingDay: 'soon' })
    const past = await call('POST', `/v1/employees/${await addEmployee(tenantId)}/separations`, writerToken, body({ lastWorkingDay: '2020-01-01' }))
    const noReason = await call('POST', `/v1/employees/${await addEmployee(tenantId)}/separations`, writerToken, body({ reason: ' ' }))
    const missing = await call('POST', `/v1/employees/${new Types.ObjectId().toHexString()}/separations`, writerToken, body())
    const other = await call('POST', `/v1/employees/${foreign}/separations`, writerToken, body())

    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'separation_exists' })
    expect(invalid.status).toBe(400)
    expect(past.status).toBe(422)
    expect(past.body).toMatchObject({ code: 'invalid_last_working_day' })
    expect(noReason.status).toBe(422)
    expect(noReason.body).toMatchObject({ code: 'reason_required' })
    expect(missing.status).toBe(404)
    expect(other.status).toBe(404)
    expect(other.body).toMatchObject({ code: 'employee_not_found' })
  })

  it('needs the permission to complete for an immediate separation', async () => {
    const employee = await addEmployee(tenantId)
    const denied = await call('POST', `/v1/employees/${employee}/separations`, writerToken, body({ type: dismissal, immediate: true, lastWorkingDay: todayUtc() }))
    const allowed = await call('POST', `/v1/employees/${employee}/separations`, completerToken, body({ type: dismissal, immediate: true, lastWorkingDay: todayUtc() }))

    expect(denied.status).toBe(403)
    expect(denied.body).toMatchObject({ code: 'permission_required' })
    expect(allowed.status).toBe(201)
    expect(allowed.body).toMatchObject({ immediate: true, contract_action: 'terminate', status: 'completed', completion: { counts: { assignments: 0 } } })
    expect((await workforce.employees.findOne(employee))?.employment_status).toBe('separated')
  })

  it('lists and reads separations for a reader, with filters and limits, and hides them from another tenant', async () => {
    const one = await record()

    const list = await call('GET', '/v1/separations?status=planned&typeCode=resignation', readerToken)
    const one404 = await call('GET', `/v1/separations/${one.id}`, otherTenantToken)
    const badLimit = await call('GET', '/v1/separations?limit=0', readerToken)
    const badStatus = await call('GET', '/v1/separations?status=done', readerToken)

    expect(list.status).toBe(200)
    expect((list.body as { id: string }[]).some((item) => item.id === one.id)).toBe(true)
    expect(JSON.stringify(list.body)).not.toContain('Pindah')
    expect((await call('GET', `/v1/separations/${one.id}`, readerToken)).status).toBe(200)
    expect(one404.status).toBe(404)
    expect(one404.body).toMatchObject({ code: 'separation_not_found' })
    expect(badLimit.status).toBe(400)
    expect(badStatus.status).toBe(400)
    expect((await call('GET', '/v1/separations', otherTenantToken)).body).toEqual([])
    for (const id of ['bad', new Types.ObjectId().toHexString()]) {
      expect((await call('GET', `/v1/separations/${id}`, readerToken)).status).toBe(404)
    }
  })

  it('shows the reason only with the details permission, answers the impact, and writes no log for reads', async () => {
    const one = await record()
    const logs = captureLogs()

    const reason = await call('GET', `/v1/separations/${one.id}/details`, detailsToken)
    const impact = await call('GET', `/v1/separations/${one.id}/impact`, readerToken)
    logs.restore()

    expect(reason.status).toBe(200)
    expect(reason.body).toEqual({ reason: 'Pindah ke kota lain' })
    expect(impact.status).toBe(200)
    expect(impact.body).toMatchObject({ lastWorkingDay: lastDay, assignments: { count: 0, ids: [] }, contract: null })
    expect(logs.written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    expect((await call('GET', `/v1/separations/${one.id}/details`, otherTenantToken)).status).toBe(404)
    expect((await call('GET', `/v1/separations/${one.id}/details`, readerToken)).status).toBe(403)
  })

  it('changes and cancels a planned separation, and refuses a stale version and a cancelled one', async () => {
    const one = await record()

    const changed = await call('PATCH', `/v1/separations/${one.id}`, writerToken, { lastWorkingDay: addDays(lastDay, 7), reason: 'Alasan baru' })
    const stale = await call('PATCH', `/v1/separations/${one.id}`, writerToken, { reason: 'x', version: 99 })
    const empty = await call('PATCH', `/v1/separations/${one.id}`, writerToken, {})
    const noReason = await call('POST', `/v1/separations/${one.id}/cancel`, writerToken, {})
    const cancelled = await call('POST', `/v1/separations/${one.id}/cancel`, writerToken, { reason: 'Mengundurkan niat' })
    const after = await call('PATCH', `/v1/separations/${one.id}`, writerToken, { reason: 'x' })

    expect(changed.status).toBe(200)
    expect(changed.body).toMatchObject({ last_working_day: addDays(lastDay, 7) })
    expect(JSON.stringify(changed.body)).not.toContain('Alasan')
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })
    expect(noReason.status).toBe(400)
    expect(cancelled.status).toBe(201)
    expect(cancelled.body).toMatchObject({ status: 'cancelled' })
    expect(after.status).toBe(422)
    expect(after.body).toMatchObject({ code: 'separation_not_planned' })
  })

  it('marks an exit checklist item and refuses an unknown one', async () => {
    const one = await record()

    const done = await call('PUT', `/v1/separations/${one.id}/checklist/id.exit-checklist-item/keys`, writerToken, { done: true })
    const unknown = await call('PUT', `/v1/separations/${one.id}/checklist/id.exit-checklist-item/nothing`, writerToken, { done: true })
    const invalid = await call('PUT', `/v1/separations/${one.id}/checklist/id.exit-checklist-item/keys`, writerToken, { done: 'yes' })

    expect(done.status).toBe(200)
    expect(done.body).toMatchObject({ checklist: [{ item: { code: 'keys' }, done: { by: { display_name: expect.any(String) } } }] })
    expect(unknown.status).toBe(422)
    expect(unknown.body).toMatchObject({ code: 'checklist_item_not_found' })
    expect(invalid.status).toBe(400)
  })

  it('completes by hand only an immediate separation, and answers 404 for a missing or malformed one and 403 for a caller without the permission', async () => {
    const planned = await record()

    const notImmediate = await call('POST', `/v1/separations/${planned.id}/complete`, completerToken, {})
    const missing = await call('POST', `/v1/separations/${new Types.ObjectId().toHexString()}/complete`, completerToken, {})
    const malformed = await call('POST', '/v1/separations/bad/complete', completerToken, {})
    const foreign = await call('POST', `/v1/separations/${planned.id}/complete`, otherTenantToken, {})

    expect(notImmediate.status).toBe(422)
    expect(notImmediate.body).toMatchObject({ code: 'separation_not_immediate' })
    expect(missing.status).toBe(404)
    expect(malformed.status).toBe(404)
    expect(foreign.status).toBe(403)
    expect((await call('GET', `/v1/separations/${planned.id}`, readerToken)).body).toMatchObject({ status: 'planned' })
  })

  it('refuses an immediate separation dated in the future (422)', async () => {
    const employee = await addEmployee(tenantId)

    const reply = await call('POST', `/v1/employees/${employee}/separations`, completerToken, body({ type: dismissal, immediate: true, lastWorkingDay: addDays(todayUtc(), 5) }))

    expect(reply.status).toBe(422)
    expect(reply.body).toMatchObject({ code: 'invalid_last_working_day' })
    expect((await workforce.employees.findOne(employee))?.employment_status).toBe('active')
  })
})
