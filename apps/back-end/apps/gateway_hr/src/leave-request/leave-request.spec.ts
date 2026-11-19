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
import { LeaveRequestManagementModule } from './leave-request-management.module'

describe('leave request endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let tenantId: string
  let otherTenantId: string
  let nurseId: string
  let colleagueId: string
  let nurseToken: string
  let colleagueToken: string
  let hrToken: string
  let readerToken: string
  let detailsToken: string
  let unlinkedToken: string
  let otherTenantToken: string
  const sick = { system: 'id.leave-type', code: 'sakit' }
  const first = addDays(todayUtc(), 20)
  const second = addDays(todayUtc(), 21)

  /**
   * Adds an active employee with a contract in force.
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
    await workforce.contracts.create({
      tenant_id: tenant,
      employee_id: employee.id,
      organization_id: new Types.ObjectId().toHexString(),
      contract_number: `C${new Types.ObjectId().toHexString().slice(-6)}`,
      employment_type: { system: 'id.employment-type', code: 'pkwtt' },
      period: { start: '2024-03-15', end: null },
      probation_end_date: null,
      fte: 1,
      working_time_scheme: null,
      status: 'active',
      previous_contract_id: null,
      termination: null,
      document: null,
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
   * A valid body for a sick leave.
   *
   * @param override - Fields to replace.
   * @returns The body.
   */
  function body(override: object = {}) {
    return { leaveType: sick, start: first, end: second, reason: 'Demam tinggi', ...override }
  }

  beforeAll(async () => {
    gateway = await createHrGateway({
      modules: [LeaveRequestManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    nurseId = await addEmployee(tenantId)
    colleagueId = await addEmployee(tenantId)
    nurseToken = await gateway.seedAndLogin(tenantId, 'nurse', [], nurseId)
    colleagueToken = await gateway.seedAndLogin(tenantId, 'colleague', [], colleagueId)
    unlinkedToken = await gateway.seedAndLogin(tenantId, 'unlinked', [], null)
    hrToken = await gateway.seedAndLogin(tenantId, 'hr', [
      PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ,
      PERMISSIONS.WORKFORCE_LEAVE_REQUEST_WRITE,
      PERMISSIONS.WORKFORCE_LEAVE_REQUEST_APPROVE_HR,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ])
    detailsToken = await gateway.seedAndLogin(tenantId, 'details', [PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ_DETAILS])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_LEAVE_REQUEST_READ,
      PERMISSIONS.WORKFORCE_LEAVE_REQUEST_WRITE,
    ])
    await workforce.codeConcepts.create({
      system: sick.system,
      code: sick.code,
      display: [{ locale: 'en', text: 'Sick' }],
      properties: {},
      mappings: [],
      period: null,
      status: 'active',
    })
    await workforce.leavePolicies.create({
      tenant_id: tenantId,
      leave_type: sick,
      effective_from: '2020-01-01',
      balance: { kind: 'none' },
      counting: 'calendar_days',
      half_days: false,
      paid: true,
      employment_types: [],
      approval: { steps: 'one_step', two_step_above_days: null },
      notice_days: 0,
      retroactive_days: 0,
      max_days_per_request: 14,
      proof: { due_days: 3 },
      notes: null,
      source: { kind: 'manual', bundle_id: null },
    })
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and the write route without its permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PUT', string][] = [
      ['POST', '/v1/leave-requests/preview'],
      ['POST', '/v1/employees/me/leave-requests'],
      ['POST', '/v1/leave-requests'],
      ['GET', '/v1/employees/me/leave-requests'],
      ['GET', '/v1/leave-requests'],
      ['GET', `/v1/leave-requests/${id}`],
      ['GET', `/v1/leave-requests/${id}/details`],
      ['PUT', `/v1/leave-requests/${id}/proof`],
    ]
    for (const [method, url] of routes) {
      expect((await call(method, url, undefined, {})).status).toBe(401)
    }
    expect((await call('POST', '/v1/leave-requests', nurseToken, { ...body(), employeeId: nurseId })).status).toBe(403)
  })

  it('previews a request without writing anything', async () => {
    const logs = captureLogs()
    const reply = await call('POST', '/v1/leave-requests/preview', nurseToken, { leaveType: sick, start: first, end: second })
    logs.restore()

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({ valid: true, problem: null, totalDays: 2, deciders: { first: { kind: 'hr_manager' }, second: false } })
    expect(logs.written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    expect((await call('GET', '/v1/employees/me/leave-requests', nurseToken)).body).toEqual([])
    const refused = await call('POST', '/v1/leave-requests/preview', nurseToken, { leaveType: sick, start: second, end: first })
    expect(refused.body).toMatchObject({ valid: false, problem: { code: 'invalid_period' } })
  })

  it('creates a request for the signed-in employee, without its reason, and logs no values', async () => {
    const logs = captureLogs()
    const reply = await call('POST', '/v1/employees/me/leave-requests', nurseToken, body())
    logs.restore()

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({ employee_id: nurseId, status: 'requested', total_days: 2, tenant_id: tenantId })
    expect(JSON.stringify(reply.body)).not.toContain('Demam')
    expect(JSON.stringify(reply.body)).not.toContain('"_id"')
    const written = JSON.stringify(logs.written)
    expect(written).toContain('leave_request_create')
    expect(written).not.toContain('Demam')
    expect(written).not.toContain(first)
  })

  it('refuses a second request on the same dates (409), a missing reason (422) and an account with no employee (403)', async () => {
    const overlap = await call('POST', '/v1/employees/me/leave-requests', nurseToken, body())
    const noReason = await call('POST', '/v1/employees/me/leave-requests', colleagueToken, body({ reason: '  ' }))
    const unlinked = await call('POST', '/v1/employees/me/leave-requests', unlinkedToken, body())
    const invalid = await call('POST', '/v1/employees/me/leave-requests', colleagueToken, { ...body(), start: 'tomorrow' })

    expect(overlap.status).toBe(409)
    expect(overlap.body).toMatchObject({ code: 'leave_overlaps' })
    expect(noReason.status).toBe(422)
    expect(noReason.body).toMatchObject({ code: 'reason_required' })
    expect(unlinked.status).toBe(403)
    expect(unlinked.body).toMatchObject({ code: 'employee_required' })
    expect(invalid.status).toBe(400)
  })

  it('lets HR request for an employee, and answers 404 for an employee of another tenant', async () => {
    const reply = await call('POST', '/v1/leave-requests', hrToken, body({ employeeId: colleagueId }))
    const foreign = await call('POST', '/v1/leave-requests', otherTenantToken, body({ employeeId: nurseId }))

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({ employee_id: colleagueId })
    expect(foreign.status).toBe(404)
    expect(foreign.body).toMatchObject({ code: 'employee_not_found' })
  })

  it('lists the own requests, and every request only for a reader; anyone may list what waits for them', async () => {
    const own = await call('GET', '/v1/employees/me/leave-requests', nurseToken)
    const all = await call('GET', '/v1/leave-requests', readerToken)
    const denied = await call('GET', '/v1/leave-requests', nurseToken)
    const waitingHr = await call('GET', '/v1/leave-requests?waitingForMe=true', hrToken)
    const waitingNurse = await call('GET', '/v1/leave-requests?waitingForMe=true', nurseToken)
    const foreign = await call('GET', '/v1/leave-requests', otherTenantToken)

    expect((own.body as unknown[]).length).toBe(1)
    expect((all.body as unknown[]).length).toBe(2)
    expect(denied.status).toBe(403)
    expect((waitingHr.body as unknown[]).length).toBe(2)
    expect(waitingNurse.body).toEqual([])
    expect(foreign.body).toEqual([])
    expect((await call('GET', '/v1/leave-requests?limit=0', readerToken)).status).toBe(400)
  })

  it('reads one request for the requester and HR, and answers 404 to a colleague, a malformed id and another tenant', async () => {
    const [mine] = (await call('GET', '/v1/employees/me/leave-requests', nurseToken)).body as { id: string }[]
    const id = mine?.id ?? ''

    expect((await call('GET', `/v1/leave-requests/${id}`, nurseToken)).status).toBe(200)
    expect((await call('GET', `/v1/leave-requests/${id}`, hrToken)).status).toBe(200)
    for (const [token, target] of [[colleagueToken, id], [otherTenantToken, id], [readerToken, 'bad'], [readerToken, new Types.ObjectId().toHexString()]] as const) {
      const reply = await call('GET', `/v1/leave-requests/${target}`, token)
      expect(reply.status).toBe(404)
      expect(reply.body).toMatchObject({ code: 'leave_request_not_found' })
    }
  })

  it('shows the reason to the requester and a holder of the permission, but not to a colleague or a mere reader', async () => {
    const [mine] = (await call('GET', '/v1/employees/me/leave-requests', nurseToken)).body as { id: string }[]
    const id = mine?.id ?? ''

    expect((await call('GET', `/v1/leave-requests/${id}/details`, nurseToken)).body).toEqual({ reason: 'Demam tinggi', proof: null })
    expect((await call('GET', `/v1/leave-requests/${id}/details`, detailsToken)).status).toBe(200)
    expect((await call('GET', `/v1/leave-requests/${id}/details`, colleagueToken)).status).toBe(404)
    expect((await call('GET', `/v1/leave-requests/${id}/details`, readerToken)).status).toBe(404)
  })

  it('attaches a proof for the requester, and refuses a bad reference, a colleague and a stale version', async () => {
    const [mine] = (await call('GET', '/v1/employees/me/leave-requests', nurseToken)).body as { id: string; version: number }[]
    const id = mine?.id ?? ''
    const proof = { fileId: 'file-1', contentType: 'application/pdf', sha256: 'a'.repeat(64) }

    const bad = await call('PUT', `/v1/leave-requests/${id}/proof`, nurseToken, { proof: { ...proof, sha256: 'zz' } })
    const other = await call('PUT', `/v1/leave-requests/${id}/proof`, colleagueToken, { proof })
    const stale = await call('PUT', `/v1/leave-requests/${id}/proof`, nurseToken, { proof, version: 99 })
    const logs = captureLogs()
    const ok = await call('PUT', `/v1/leave-requests/${id}/proof`, nurseToken, { proof })
    logs.restore()

    expect(bad.status).toBe(400)
    expect(other.status).toBe(404)
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ proof_received: true })
    expect(JSON.stringify(ok.body)).not.toContain('file-1')
    expect(JSON.stringify(logs.written)).not.toContain('file-1')
    expect((await call('GET', `/v1/leave-requests/${id}/details`, nurseToken)).body).toMatchObject({ proof: { file_id: 'file-1' } })
  })
})
