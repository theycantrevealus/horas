import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { ShiftSwapManagementModule } from './shift-swap-management.module'

describe('shift swap routes (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let sitiToken: string
  let budiToken: string
  let thirdToken: string
  let unlinkedToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let facilityId: string
  let unitId: string
  let rosterId: string
  let siti: string
  let budi: string
  let counter = 0

  /**
   * Adds an employee on probation or active.
   *
   * @param number - Employee number.
   * @returns The employee identifier.
   */
  async function addEmployee(number: string) {
    return (
      await workforce.employees.create({
        tenant_id: tenantId,
        employee_number: number,
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
        employment_status_since: '2026-01-01',
        current_employment: null,
        primary_assignment: null,
        original_hire_date: '2026-01-01',
        separation_date: null,
        practitioner_ids: [],
        work_contacts: [],
        photo: null,
        preferred_language: null,
      })
    ).id
  }

  /**
   * Adds a planned assignment in the main roster, one day later each time so nothing clashes.
   *
   * @param employeeId - The employee.
   * @param roster - The roster; the main roster by default.
   * @returns The assignment identifier.
   */
  async function addAssignment(employeeId: string, roster: { id: string; unit_id: string } = { id: rosterId, unit_id: unitId }) {
    counter += 1
    const date = `2099-03-${String(1 + (counter % 28)).padStart(2, '0')}`
    return (
      await workforce.rosterAssignments.create({
        tenant_id: tenantId,
        roster_id: roster.id,
        unit_id: roster.unit_id,
        facility_id: facilityId,
        employee_id: employeeId,
        date,
        shift: { definition_id: new Types.ObjectId().toHexString(), code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
        starts_at: new Date(`${date}T00:00:00Z`),
        ends_at: new Date(`${date}T08:00:00Z`),
        role: 'staff',
        status: 'planned',
        source: { kind: 'roster', ref_id: null },
        change_reason: null,
        revision: 1,
        overtime: null,
        flag: null,
        is_flagged: false,
      })
    ).id
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

  beforeAll(async () => {
    gateway = await createHrGateway({ modules: [ShiftSwapManagementModule], ...workforce.options })
    call = gateway.call
    tenantId = gateway.tenantId
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        code: 'rs-sehat',
        name: [{ locale: 'en', text: 'RS' }],
        address: null,
        timezone: 'Asia/Jakarta',
        holiday_calendar_codes: [],
        external_ids: [],
        status: 'active',
      })
    ).id
    unitId = (
      await workforce.units.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId,
        code: 'ward-1',
        name: [{ locale: 'en', text: 'Ward' }],
        type: { system: 'id.unit-type', code: 'ward' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: false,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      })
    ).id
    rosterId = (
      await workforce.rosters.create({
        tenant_id: tenantId,
        unit_id: unitId,
        facility_id: facilityId,
        period: { start: '2099-03-01', end: '2099-03-31' },
        status: 'published',
        revision: 1,
        prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
        submitted: null,
        approved: null,
        published: null,
        closed: null,
        return_reason: null,
        coverage_overrides: [],
        validation: null,
      })
    ).id
    siti = await addEmployee('E001')
    budi = await addEmployee('E002')
    const third = await addEmployee('E003')
    sitiToken = await gateway.seedAndLogin(tenantId, 'siti', [], siti)
    budiToken = await gateway.seedAndLogin(tenantId, 'budi', [], budi)
    thirdToken = await gateway.seedAndLogin(tenantId, 'third', [], third)
    unlinkedToken = await gateway.seedAndLogin(tenantId, 'unlinked', [], null)
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_SHIFT_SWAP_READ], null)
    otherTenantToken = await gateway.seedAndLogin(gateway.otherTenantId, 'other', [PERMISSIONS.WORKFORCE_SHIFT_SWAP_READ])
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and the tenant list without its permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    for (const [method, url] of [['GET', '/v1/shift-swaps'], ['GET', '/v1/employees/me/shift-swaps'], ['POST', '/v1/shift-swaps'], ['POST', `/v1/shift-swaps/${id}/accept`], ['POST', `/v1/shift-swaps/${id}/cancel`]] as const) {
      expect((await call(method, url, undefined, method === 'POST' ? {} : undefined)).status).toBe(401)
    }
    expect((await call('GET', '/v1/shift-swaps', sitiToken)).status).toBe(403)
  })

  it('asks, accepts and cancels over HTTP, and both employees see it in their own list', async () => {
    const mine = await addAssignment(siti)
    const theirs = await addAssignment(budi)

    const created = await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: mine, counterpartEmployeeId: budi, counterpartAssignmentId: theirs, reason: 'Keperluan keluarga' })

    expect(created.status).toBe(201)
    const swap = created.body as Record<string, any>
    expect(swap).toMatchObject({ tenant_id: tenantId, unit_id: unitId, roster_id: rosterId, requester: { employee_id: siti, assignment_id: mine }, counterpart: { employee_id: budi, assignment_id: theirs }, status: 'requested', decision: null })
    expect(swap).not.toHaveProperty('_id')
    for (const token of [sitiToken, budiToken]) {
      const own = await call('GET', '/v1/employees/me/shift-swaps?status=requested', token)
      expect(own.status).toBe(200)
      expect((own.body as Record<string, any>[]).map((item) => item.id)).toContain(swap.id)
    }
    expect(((await call('GET', '/v1/employees/me/shift-swaps', thirdToken)).body as unknown[])).toEqual([])

    const accepted = await call('POST', `/v1/shift-swaps/${swap.id}/accept`, budiToken, {})
    expect(accepted.status).toBe(201)
    expect(accepted.body).toMatchObject({ id: swap.id, status: 'accepted_by_counterpart' })
    expect((accepted.body as Record<string, any>).counterpart_accepted_at).toBeTruthy()

    const listed = await call('GET', `/v1/shift-swaps?unitId=${unitId}&status=accepted_by_counterpart&employeeId=${siti}`, readerToken)
    expect(listed.status).toBe(200)
    expect((listed.body as Record<string, any>[]).map((item) => item.id)).toContain(swap.id)

    const cancelled = await call('POST', `/v1/shift-swaps/${swap.id}/cancel`, sitiToken, {})
    expect(cancelled.status).toBe(201)
    expect(cancelled.body).toMatchObject({ id: swap.id, status: 'cancelled' })
  })

  it('answers 403 for an account without an employee, a stranger accepting and a counterpart cancelling', async () => {
    const mine = await addAssignment(siti)
    const swap = (await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: mine, counterpartEmployeeId: budi, reason: 'Sakit' })).body as Record<string, any>

    for (const [reply, code] of [
      [await call('POST', '/v1/shift-swaps', unlinkedToken, { assignmentId: mine, counterpartEmployeeId: budi, reason: 'x' }), 'employee_required'],
      [await call('GET', '/v1/employees/me/shift-swaps', unlinkedToken), 'employee_required'],
      [await call('POST', `/v1/shift-swaps/${swap.id}/accept`, thirdToken, {}), 'not_the_counterpart'],
      [await call('POST', `/v1/shift-swaps/${swap.id}/accept`, sitiToken, {}), 'not_the_counterpart'],
      [await call('POST', `/v1/shift-swaps/${swap.id}/cancel`, budiToken, {}), 'not_the_requester'],
    ] as const) {
      expect(reply.status).toBe(403)
      expect(reply.body).toMatchObject({ code })
    }
  })

  it('answers 422 for a rule that is broken, 409 for an open request and a stale version, and 404 for unknown ids', async () => {
    const mine = await addAssignment(siti)
    const swap = (await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: mine, counterpartEmployeeId: budi, reason: 'Sakit' })).body as Record<string, any>

    const again = await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: mine, counterpartEmployeeId: budi, reason: 'Sakit lagi' })
    expect(again.status).toBe(409)
    expect(again.body).toMatchObject({ code: 'swap_exists' })
    const stale = await call('POST', `/v1/shift-swaps/${swap.id}/accept`, budiToken, { version: swap.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    const self = await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: await addAssignment(siti), counterpartEmployeeId: siti, reason: 'x' })
    expect(self.status).toBe(422)
    expect(self.body).toMatchObject({ code: 'counterpart_is_requester' })
    const notYours = await call('POST', '/v1/shift-swaps', budiToken, { assignmentId: await addAssignment(siti), counterpartEmployeeId: siti, reason: 'x' })
    expect(notYours.status).toBe(422)
    expect(notYours.body).toMatchObject({ code: 'assignment_not_yours' })
    await workforce.rosters.update(rosterId, { status: 'closed' })
    const closed = await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: await addAssignment(siti), counterpartEmployeeId: budi, reason: 'x' })
    await workforce.rosters.update(rosterId, { status: 'published' })
    expect(closed.status).toBe(422)
    expect(closed.body).toMatchObject({ code: 'roster_not_published' })
    expect((await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: new Types.ObjectId().toHexString(), counterpartEmployeeId: budi, reason: 'x' })).status).toBe(404)
    for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
      for (const move of ['accept', 'cancel']) {
        const reply = await call('POST', `/v1/shift-swaps/${id}/${move}`, budiToken, {})
        expect(reply.status).toBe(404)
        expect(reply.body).toMatchObject({ code: 'swap_not_found' })
      }
    }
    expect((await call('POST', `/v1/shift-swaps/${swap.id}/accept`, otherTenantToken, {})).status).toBe(404)
    expect(((await call('GET', '/v1/shift-swaps', otherTenantToken)).body as unknown[])).toEqual([])
  })

  it('answers 400 for a bad body or query', async () => {
    const mine = await addAssignment(siti)
    const valid = { assignmentId: mine, counterpartEmployeeId: budi, reason: 'Sakit' }
    for (const bad of [{ ...valid, assignmentId: 'bad' }, { ...valid, counterpartEmployeeId: 'bad' }, { ...valid, counterpartAssignmentId: 'bad' }, { ...valid, reason: '' }, { ...valid, reason: 'x'.repeat(501) }, { counterpartEmployeeId: budi, reason: 'x' }]) {
      expect((await call('POST', '/v1/shift-swaps', sitiToken, bad)).status).toBe(400)
    }
    expect((await call('POST', `/v1/shift-swaps/${new Types.ObjectId().toHexString()}/accept`, budiToken, { version: -1 })).status).toBe(400)
    for (const query of ['status=maybe', 'limit=0', 'limit=101', 'offset=-1', 'unitId=bad', 'rosterId=bad', 'employeeId=bad']) {
      expect((await call('GET', `/v1/shift-swaps?${query}`, readerToken)).status).toBe(400)
    }
    for (const query of ['status=maybe', 'limit=0']) {
      expect((await call('GET', `/v1/employees/me/shift-swaps?${query}`, sitiToken)).status).toBe(400)
    }
  })

  it('writes only the access log for a read, and one entry per write without employees, dates or reasons', async () => {
    const mine = await addAssignment(siti)
    const { written, restore } = captureLogs()
    try {
      await call('GET', '/v1/shift-swaps', readerToken)
      await call('GET', '/v1/employees/me/shift-swaps', sitiToken)
      const swap = (await call('POST', '/v1/shift-swaps', sitiToken, { assignmentId: mine, counterpartEmployeeId: budi, reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('POST', `/v1/shift-swaps/${swap.id}/accept`, budiToken, {})
      await call('POST', `/v1/shift-swaps/${swap.id}/cancel`, sitiToken, {})
      await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(5))

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual(['swap_create', 'swap_accept', 'swap_cancel'])
      for (const text of ['Alasan Rahasia', mine, siti, budi]) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
