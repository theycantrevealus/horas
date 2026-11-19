import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { LeaveBalanceManagementModule } from './leave-balance-management.module'

describe('leave balance endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let readerToken: string
  let adjusterToken: string
  let meToken: string
  let unlinkedToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let employeeId: string
  let foreignEmployeeId: string
  const annual = { system: 'id.leave-type', code: 'tahunan' }
  const sick = { system: 'id.leave-type', code: 'sakit' }

  /**
   * Adds an employee with a contract in force since 2024-03-15.
   *
   * @param tenant - Tenant of the record.
   * @param id - Fixed identifier, when the account is linked to it.
   * @returns The employee identifier.
   */
  async function addEmployee(tenant: string, id?: string): Promise<string> {
    const employee = await workforce.employees.create(
      {
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
      },
      id,
    )
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
   * Posts a ledger entry directly.
   *
   * @param employee - The employee.
   * @param kind - What the entry does.
   * @param days - Signed days.
   * @param override - Other fields.
   * @param tenant - Tenant of the record.
   */
  async function post(
    employee: string,
    kind: 'grant' | 'use' | 'carry_over' | 'adjustment',
    days: number,
    override: object = {},
    tenant = tenantId,
  ) {
    await workforce.leaveLedger.append({
      tenant_id: tenant,
      employee_id: employee,
      leave_type: annual,
      period: { start: '2026-03-15', end: '2027-03-14' },
      kind,
      days,
      bucket: 'own',
      expires_on: null,
      source: { kind: 'job', ref_id: null, date: null },
      dedupe_key: null,
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
      modules: [LeaveBalanceManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    employeeId = await addEmployee(tenantId)
    foreignEmployeeId = await addEmployee(otherTenantId)
    const meId = await addEmployee(tenantId)
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_LEAVE_BALANCE_READ])
    adjusterToken = await gateway.seedAndLogin(tenantId, 'adjuster', [
      PERMISSIONS.WORKFORCE_LEAVE_BALANCE_READ,
      PERMISSIONS.WORKFORCE_LEAVE_BALANCE_ADJUST,
    ])
    meToken = await gateway.seedAndLogin(tenantId, 'me', [], meId)
    unlinkedToken = await gateway.seedAndLogin(tenantId, 'unlinked', [], null)
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_LEAVE_BALANCE_READ,
      PERMISSIONS.WORKFORCE_LEAVE_BALANCE_ADJUST,
    ])
    for (const [tenant, code, balance] of [
      [tenantId, 'tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false }],
      [tenantId, 'sakit', { kind: 'none' }],
      [otherTenantId, 'tahunan', { kind: 'period', period: 'service_year', days: 12, min_service_months: 12, carry_over: null, deduct_collective_leave: false }],
    ] as const) {
      await workforce.leavePolicies.create({
        tenant_id: tenant,
        leave_type: { system: 'id.leave-type', code },
        effective_from: '2020-01-01',
        balance,
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
    }
    await post(employeeId, 'grant', 12)
    await post(employeeId, 'carry_over', 3, { bucket: 'carry_over', expires_on: '2027-06-30' })
    await post(employeeId, 'use', -2)
    await post(foreignEmployeeId, 'grant', 99, {}, otherTenantId)
    await post(meId, 'grant', 12)
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and the permission routes without permission (403)', async () => {
    const routes: ['GET' | 'POST', string, object | undefined][] = [
      ['GET', `/v1/employees/${employeeId}/leave-balances`, undefined],
      ['GET', `/v1/employees/${employeeId}/leave-ledger`, undefined],
      ['POST', `/v1/employees/${employeeId}/leave-adjustments`, {}],
      ['GET', '/v1/employees/me/leave-balances', undefined],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.slice(0, 3)) {
      expect((await call(method, url, meToken, payload)).status).toBe(403)
    }
    expect((await call('POST', `/v1/employees/${employeeId}/leave-adjustments`, readerToken, {})).status).toBe(403)
  })

  it('answers the balances of an employee, for today and for the period of a date', async () => {
    const reply = await call('GET', `/v1/employees/${employeeId}/leave-balances`, readerToken)

    expect(reply.status).toBe(200)
    expect(reply.body).toEqual([
      {
        leaveType: annual,
        period: { start: '2026-03-15', end: '2027-03-14' },
        granted: 12,
        used: 2,
        carriedOver: 3,
        carriedOverExpiresOn: '2027-06-30',
        expired: 0,
        adjusted: 0,
        pending: 0,
        available: 13,
        carryOverLeft: 3,
        ownLeft: 10,
      },
    ])
    const earlier = await call('GET', `/v1/employees/${employeeId}/leave-balances?onDate=2025-06-01`, readerToken)
    expect((earlier.body as any[])[0]).toMatchObject({ period: { start: '2025-03-15', end: '2026-03-14' }, granted: 0 })
  })

  it('lists the ledger with filters and paging, oldest first', async () => {
    await post(employeeId, 'grant', 5, { leave_type: sick, period: { start: '2026-01-01', end: '2026-12-31' } })

    const all = await call('GET', `/v1/employees/${employeeId}/leave-ledger`, readerToken)
    const annualOnly = await call('GET', `/v1/employees/${employeeId}/leave-ledger?leaveTypeSystem=id.leave-type&leaveTypeCode=tahunan&periodStart=2026-03-15`, readerToken)
    const page = await call('GET', `/v1/employees/${employeeId}/leave-ledger?limit=1&offset=1`, readerToken)

    expect((all.body as any[]).map((entry) => entry.kind)).toEqual(['grant', 'carry_over', 'use', 'grant'])
    expect((annualOnly.body as any[]).map((entry) => entry.kind)).toEqual(['grant', 'carry_over', 'use'])
    expect((page.body as any[]).map((entry) => entry.kind)).toEqual(['carry_over'])
    expect(JSON.stringify(all.body)).not.toContain('"_id"')
  })

  it('adjusts a balance and shows it in the balance and the ledger', async () => {
    const reply = await call('POST', `/v1/employees/${employeeId}/leave-adjustments`, adjusterToken, {
      leaveType: annual,
      periodStart: '2026-03-15',
      days: -1.5,
      reason: 'Koreksi saldo',
    })

    expect(reply.status).toBe(201)
    expect(reply.body).toMatchObject({
      kind: 'adjustment',
      days: -1.5,
      bucket: 'own',
      period: { start: '2026-03-15', end: '2027-03-14' },
      source: { kind: 'adjustment', ref_id: null, date: null },
      tenant_id: tenantId,
    })
    const balances = await call('GET', `/v1/employees/${employeeId}/leave-balances`, readerToken)
    expect((balances.body as any[])[0]).toMatchObject({ adjusted: -1.5, available: 11.5 })
  })

  it('answers the signed-in employee their own balances, and 403 for an account with no linked employee', async () => {
    const own = await call('GET', '/v1/employees/me/leave-balances', meToken)
    const unlinked = await call('GET', '/v1/employees/me/leave-balances', unlinkedToken)

    expect(own.status).toBe(200)
    expect((own.body as any[])[0]).toMatchObject({ leaveType: annual, granted: 12, available: 12 })
    expect(unlinked.status).toBe(403)
    expect(unlinked.body).toMatchObject({ code: 'employee_required' })
    expect((await call('GET', '/v1/employees/me/leave-balances?onDate=2025-06-01', meToken)).status).toBe(200)
  })

  it('answers 404 for a missing, malformed or foreign employee, on every route', async () => {
    const unknown = new Types.ObjectId().toHexString()
    const adjustment = { leaveType: annual, periodStart: '2026-03-15', days: 1, reason: 'Koreksi' }

    for (const id of [unknown, 'bad', foreignEmployeeId]) {
      for (const reply of [
        await call('GET', `/v1/employees/${id}/leave-balances`, adjusterToken),
        await call('GET', `/v1/employees/${id}/leave-ledger`, adjusterToken),
        await call('POST', `/v1/employees/${id}/leave-adjustments`, adjusterToken, adjustment),
      ]) {
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'employee_not_found' })
      }
    }
    const theirs = await call('GET', `/v1/employees/${foreignEmployeeId}/leave-balances`, otherTenantToken)
    expect((theirs.body as any[])[0]).toMatchObject({ granted: 99 })
  })

  it('answers 422 for the business rules of an adjustment, and writes nothing', async () => {
    const before = ((await call('GET', `/v1/employees/${employeeId}/leave-ledger?limit=100`, adjusterToken)).body as any[]).length
    const adjust = async (override: object) =>
      (await call('POST', `/v1/employees/${employeeId}/leave-adjustments`, adjusterToken, { leaveType: annual, periodStart: '2026-03-15', days: 1, reason: 'Koreksi', ...override })).body

    expect(await adjust({ days: 0 })).toMatchObject({ code: 'invalid_days' })
    expect(await adjust({ days: 0.3 })).toMatchObject({ code: 'invalid_days' })
    expect(await adjust({ days: 400 })).toMatchObject({ code: 'invalid_days' })
    expect(await adjust({ periodStart: '2025-03-15' })).toMatchObject({ code: 'period_not_found' })
    expect(await adjust({ leaveType: { system: 'id.profession', code: 'perawat' } })).toMatchObject({ code: 'invalid_leave_type' })
    const after = ((await call('GET', `/v1/employees/${employeeId}/leave-ledger?limit=100`, adjusterToken)).body as any[]).length
    expect(after).toBe(before)
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    const url = `/v1/employees/${employeeId}/leave-adjustments`
    const body = { leaveType: annual, periodStart: '2026-03-15', days: 1, reason: 'Koreksi' }
    for (const override of [{ leaveType: 'tahunan' }, { periodStart: '2026-02-30' }, { days: 'many' }, { reason: '' }, { reason: '   ' }, { reason: undefined }, { reason: 'x'.repeat(501) }, { leaveType: undefined }]) {
      expect((await call('POST', url, adjusterToken, { ...body, ...override })).status).toBe(400)
    }
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'periodStart=2026-02-30', 'periodStart=soon']) {
      expect((await call('GET', `/v1/employees/${employeeId}/leave-ledger?${query}`, readerToken)).status).toBe(400)
    }
    for (const query of ['onDate=2026-02-30', 'onDate=soon']) {
      expect((await call('GET', `/v1/employees/${employeeId}/leave-balances?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/employees/${employeeId}/leave-balances`, readerToken),
        await call('GET', `/v1/employees/${employeeId}/leave-ledger`, readerToken),
        await call('GET', '/v1/employees/me/leave-balances', meToken),
        await call('GET', `/v1/employees/${new Types.ObjectId().toHexString()}/leave-balances`, readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 200, 404])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per adjustment, without days, dates, leave types or reasons', async () => {
    const { written, restore } = captureLogs()
    try {
      await call('POST', `/v1/employees/${employeeId}/leave-adjustments`, adjusterToken, {
        leaveType: annual,
        periodStart: '2026-03-15',
        days: 2.5,
        reason: 'Alasan Rahasia',
      })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(1),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual(['leave_adjust'])
      for (const text of ['Alasan Rahasia', 'tahunan', '2026-03-15', '2.5']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
