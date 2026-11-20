import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { ShiftManagementModule } from '../shift/shift-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { RosterAssignmentManagementModule } from './roster-assignment-management.module'

describe('roster assignment endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let shiftToken: string
  let correctorToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let unitId: string
  let rosterId: string
  let morningId: string
  let nightId: string
  let employeeCounter = 0

  // Far in the future, so no date is in the past. 2099-03-02 is a Monday.
  const monday = '2099-03-02'

  /**
   * Adds an employee on probation or active.
   *
   * @param override - Employment status.
   * @returns The employee identifier.
   */
  async function addEmployee(status: 'active' | 'suspended' = 'active') {
    employeeCounter += 1
    return (
      await workforce.employees.create({
        tenant_id: tenantId,
        employee_number: `E${employeeCounter}`,
        name: { use: 'official', text: 'Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' },
        is_clinical: false,
        profession: null,
        specialties: [],
        clinical_level: null,
        employment_status: status,
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
   * Adds a shift of the facility.
   *
   * @param code - Shift code.
   * @param night - Whether it is the overnight shift.
   * @returns The shift identifier.
   */
  async function addShift(code: string, night = false) {
    return (
      await workforce.shifts.create({
        tenant_id: tenantId,
        facility_id: facilityId,
        code,
        name: [{ locale: 'en', text: code }],
        type: 'regular',
        start_time: night ? '21:00' : '07:00',
        end_time: night ? '07:00' : '15:00',
        paid_minutes: night ? 540 : 480,
        is_night: night,
        unit_ids: [],
        status: 'active',
      })
    ).id
  }

  /**
   * Adds an assignment through the API as the writer.
   *
   * @param employeeId - The employee.
   * @param override - Fields that replace the defaults.
   * @param roster - Roster identifier.
   * @returns The reply.
   */
  function add(employeeId: string, override: object = {}, roster = rosterId) {
    return call('POST', `/v1/rosters/${roster}/assignments`, writerToken, {
      employeeId,
      date: monday,
      shiftId: morningId,
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
      modules: [RosterAssignmentManagementModule, ShiftManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    ;({ tenantId, otherTenantId } = gateway)
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ,
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE,
    ])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ,
    ])
    correctorToken = await gateway.seedAndLogin(tenantId, 'corrector', [
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ,
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE,
      PERMISSIONS.WORKFORCE_ROSTER_CORRECT_PAST,
    ])
    shiftToken = await gateway.seedAndLogin(tenantId, 'shifts', [
      PERMISSIONS.WORKFORCE_SHIFT_DEFINITION_WRITE,
    ])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_READ,
      PERMISSIONS.WORKFORCE_ROSTER_ASSIGNMENT_WRITE,
    ])
    const organizationId = new Types.ObjectId().toHexString()
    facilityId = (
      await workforce.facilities.create({
        tenant_id: tenantId,
        organization_id: organizationId,
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
        organization_id: organizationId,
        facility_id: facilityId,
        code: 'ward-a',
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
        status: 'draft',
        revision: 0,
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
    morningId = await addShift('P')
    nightId = await addShift('M', true)
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401) and the writes without the write permission (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    const routes: ['GET' | 'POST' | 'PATCH', string, object | undefined][] = [
      ['GET', `/v1/rosters/${id}/assignments`, undefined],
      ['POST', `/v1/rosters/${id}/assignments`, {}],
      ['PATCH', `/v1/roster-assignments/${id}`, {}],
      ['POST', `/v1/roster-assignments/${id}/cancel`, {}],
    ]
    for (const [method, url, payload] of routes) {
      expect((await call(method, url, undefined, payload)).status).toBe(401)
    }
    for (const [method, url, payload] of routes.filter(([method]) => method !== 'GET')) {
      expect((await call(method, url, readerToken, payload)).status).toBe(403)
    }
    expect((await call('GET', `/v1/rosters/${rosterId}/assignments`, readerToken)).status).toBe(200)
  })

  it('adds an assignment, lists it with filters, changes it and cancels it', async () => {
    const employeeId = await addEmployee()
    const created = await add(employeeId, { role: 'team_leader', reason: 'Baru' })

    expect(created.status).toBe(201)
    const body = created.body as Record<string, any>
    expect(body).toMatchObject({
      tenant_id: tenantId,
      roster_id: rosterId,
      unit_id: unitId,
      facility_id: facilityId,
      employee_id: employeeId,
      date: monday,
      shift: { definition_id: morningId, code: 'P', start_time: '07:00', end_time: '15:00', paid_minutes: 480 },
      starts_at: '2099-03-02T00:00:00.000Z',
      ends_at: '2099-03-02T08:00:00.000Z',
      role: 'team_leader',
      status: 'planned',
      source: { kind: 'roster', ref_id: rosterId },
      overtime: null,
      flag: null,
      is_flagged: false,
    })
    expect(body).not.toHaveProperty('_id')

    const list = await call('GET', `/v1/rosters/${rosterId}/assignments?employeeId=${employeeId}&date=${monday}&status=planned`, readerToken)
    expect((list.body as any[]).map((item) => item.id)).toEqual([body.id])
    const range = await call('GET', `/v1/rosters/${rosterId}/assignments?from=2099-03-03`, readerToken)
    expect((range.body as any[]).map((item) => item.id)).not.toContain(body.id)

    const changed = await call('PATCH', `/v1/roster-assignments/${body.id}`, writerToken, { shiftId: nightId, role: 'staff', version: body.version })
    expect(changed.status).toBe(200)
    expect(changed.body).toMatchObject({ shift: { code: 'M', is_night: true }, role: 'staff', starts_at: '2099-03-02T14:00:00.000Z', ends_at: '2099-03-03T00:00:00.000Z', employee_id: employeeId, date: monday })
    const cancelled = await call('POST', `/v1/roster-assignments/${body.id}/cancel`, writerToken, {})
    expect(cancelled.status).toBe(201)
    expect(cancelled.body).toMatchObject({ status: 'cancelled' })
    const again = await call('POST', `/v1/roster-assignments/${body.id}/cancel`, writerToken, {})
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'assignment_cancelled' })
  })

  it('answers 409 for a second shift on the date and a stale version, and 422 for the working-time and roster rules', async () => {
    const employeeId = await addEmployee()
    const first = (await add(employeeId, { date: '2099-03-10' })).body as Record<string, any>

    const second = await add(employeeId, { date: '2099-03-10', shiftId: nightId })
    expect(second.status).toBe(409)
    expect(second.body).toMatchObject({ code: 'assignment_exists' })
    const stale = await call('PATCH', `/v1/roster-assignments/${first.id}`, writerToken, { role: 'staff', version: first.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })

    // An overnight shift on the 11th ends at 07:00 on the 12th, so a morning shift that starts then has no rest.
    await add(employeeId, { date: '2099-03-11', shiftId: nightId })
    expect((await add(employeeId, { date: '2099-03-12' })).body).toMatchObject({ code: 'rest_too_short' })
    expect((await add(employeeId, { date: '2099-03-11', shiftId: morningId }, rosterId)).body).toMatchObject({ code: 'assignment_exists' })
    expect((await add(await addEmployee('suspended'))).body).toMatchObject({ code: 'employee_not_assignable' })
    expect((await add(employeeId, { date: '2099-04-01' })).body).toMatchObject({ code: 'date_outside_period' })
    expect((await add(new Types.ObjectId().toHexString())).body).toMatchObject({ code: 'employee_not_found' })
    expect((await add(employeeId, { shiftId: new Types.ObjectId().toHexString() })).body).toMatchObject({ code: 'shift_not_found' })
    expect((await call('PATCH', `/v1/roster-assignments/${first.id}`, writerToken, {})).body).toMatchObject({ code: 'empty_update' })
  })

  it('refuses a roster that was submitted or approved, and answers 404 for a missing, malformed or foreign roster or assignment', async () => {
    const employeeId = await addEmployee()
    const roster = await workforce.rosters.create({
      tenant_id: tenantId,
      unit_id: unitId,
      facility_id: facilityId,
      period: { start: '2099-04-01', end: '2099-04-30' },
      status: 'approved',
      revision: 0,
      prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
      submitted: null,
      approved: null,
      published: null,
      closed: null,
      return_reason: null,
      coverage_overrides: [],
      validation: null,
    })
    expect((await add(employeeId, { date: '2099-04-06' }, roster.id)).body).toMatchObject({ code: 'roster_locked' })

    const unknown = new Types.ObjectId().toHexString()
    const mine = (await add(employeeId, { date: '2099-03-17' })).body as Record<string, any>
    for (const id of [unknown, 'bad']) {
      expect((await add(employeeId, {}, id)).body).toMatchObject({ code: 'roster_not_found' })
      expect((await call('GET', `/v1/rosters/${id}/assignments`, readerToken)).body).toMatchObject({ code: 'roster_not_found' })
      expect((await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { role: 'staff' })).body).toMatchObject({ code: 'roster_assignment_not_found' })
      expect((await call('POST', `/v1/roster-assignments/${id}/cancel`, writerToken, {})).body).toMatchObject({ code: 'roster_assignment_not_found' })
    }
    expect((await call('GET', `/v1/rosters/${rosterId}/assignments`, otherTenantToken)).status).toBe(404)
    expect((await call('PATCH', `/v1/roster-assignments/${mine.id}`, otherTenantToken, { role: 'staff' })).status).toBe(404)
    expect((await call('POST', `/v1/roster-assignments/${mine.id}/cancel`, otherTenantToken, {})).status).toBe(404)
  })

  it('changes a published roster only with a reason, and raises its revision', async () => {
    const roster = await workforce.rosters.create({
      tenant_id: tenantId,
      unit_id: unitId,
      facility_id: facilityId,
      period: { start: '2099-05-01', end: '2099-05-31' },
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
    const employeeId = await addEmployee()

    const missing = await add(employeeId, { date: '2099-05-05' }, roster.id)
    expect(missing.status).toBe(422)
    expect(missing.body).toMatchObject({ code: 'reason_required' })
    const created = await add(employeeId, { date: '2099-05-05', reason: 'Pengganti sakit' }, roster.id)
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ source: { kind: 'change_request', ref_id: null }, change_reason: 'Pengganti sakit', revision: 2 })
    expect((await workforce.rosters.findOne(roster.id))?.revision).toBe(2)
    const id = (created.body as Record<string, any>).id
    expect((await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { role: 'supervisor' })).body).toMatchObject({ code: 'reason_required' })
    const changed = await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { role: 'supervisor', reason: 'Peran baru' })
    expect(changed.body).toMatchObject({ role: 'supervisor', revision: 3, change_reason: 'Peran baru' })
    expect((await call('POST', `/v1/roster-assignments/${id}/cancel`, writerToken, {})).body).toMatchObject({ code: 'reason_required' })
    const cancelled = await call('POST', `/v1/roster-assignments/${id}/cancel`, writerToken, { reason: 'Izin' })
    expect(cancelled.body).toMatchObject({ status: 'cancelled', revision: 4 })
    expect((await workforce.rosters.findOne(roster.id))?.revision).toBe(4)
  })

  it('refuses the past, unless the caller holds the permission to correct it and gives a reason', async () => {
    const roster = await workforce.rosters.create({
      tenant_id: tenantId,
      unit_id: unitId,
      facility_id: facilityId,
      period: { start: '2020-01-01', end: '2020-01-31' },
      status: 'draft',
      revision: 0,
      prepared_by: { account_id: 'head', display_name: 'Head', kind: 'account' },
      submitted: null,
      approved: null,
      published: null,
      closed: null,
      return_reason: null,
      coverage_overrides: [],
      validation: null,
    })
    const employeeId = await addEmployee()
    const body = { employeeId, date: '2020-01-10', shiftId: morningId }

    const refused = await call('POST', `/v1/rosters/${roster.id}/assignments`, writerToken, { ...body, reason: 'Koreksi' })
    expect(refused.status).toBe(422)
    expect(refused.body).toMatchObject({ code: 'assignment_in_past' })
    expect((await call('POST', `/v1/rosters/${roster.id}/assignments`, correctorToken, body)).body).toMatchObject({ code: 'reason_required' })
    const created = await call('POST', `/v1/rosters/${roster.id}/assignments`, correctorToken, { ...body, reason: 'Koreksi absensi' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ date: '2020-01-10', change_reason: 'Koreksi absensi' })
    const id = (created.body as Record<string, any>).id
    expect((await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { role: 'supervisor', reason: 'x' })).body).toMatchObject({ code: 'assignment_in_past' })
    expect((await call('PATCH', `/v1/roster-assignments/${id}`, correctorToken, { role: 'supervisor', reason: 'Koreksi peran' })).status).toBe(200)
    expect((await call('POST', `/v1/roster-assignments/${id}/cancel`, writerToken, { reason: 'x' })).body).toMatchObject({ code: 'assignment_in_past' })
    expect((await call('POST', `/v1/roster-assignments/${id}/cancel`, correctorToken, { reason: 'Salah isi' })).status).toBe(201)
  })

  describe('who is on duty and my own roster', () => {
    let publishedId: string
    let meId: string
    let meToken: string
    let unlinkedToken: string

    /**
     * Stores a planned assignment in the published roster, starting at a UTC hour of a day.
     *
     * @param employeeId - The employee.
     * @param date - The day.
     * @param from - Start hour (UTC).
     * @param to - End hour (UTC).
     * @param role - Role in the shift.
     * @returns The assignment identifier.
     */
    async function duty(employeeId: string, date: string, from: number, to: number, role: 'staff' | 'team_leader' = 'staff') {
      const day = Date.parse(`${date}T00:00:00Z`)
      return (
        await workforce.rosterAssignments.create({
          tenant_id: tenantId,
          roster_id: publishedId,
          unit_id: unitId,
          facility_id: facilityId,
          employee_id: employeeId,
          date,
          shift: { definition_id: morningId, code: 'P', type: 'regular', start_time: '07:00', end_time: '15:00', paid_minutes: 480, is_night: false },
          starts_at: new Date(day + from * 3_600_000),
          ends_at: new Date(day + to * 3_600_000),
          role,
          status: 'planned',
          source: { kind: 'roster', ref_id: publishedId },
          cancellation: null,
          change_reason: null,
          revision: 1,
          overtime: null,
          flag: null,
          is_flagged: false,
        })
      ).id
    }

    beforeAll(async () => {
      publishedId = (
        await workforce.rosters.create({
          tenant_id: tenantId,
          unit_id: unitId,
          facility_id: facilityId,
          period: { start: '2099-06-01', end: '2099-06-30' },
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
      meId = await addEmployee()
      meToken = await gateway.seedAndLogin(tenantId, 'me', [], meId)
      unlinkedToken = await gateway.seedAndLogin(tenantId, 'unlinked', [], null)
    })

    it('answers who is on duty in a unit at a moment, with the role', async () => {
      const first = await duty(meId, '2099-06-10', 8, 16)
      const lead = await duty(await addEmployee(), '2099-06-10', 10, 18, 'team_leader')
      await duty(await addEmployee(), '2099-06-10', 17, 23)

      const reply = await call('GET', `/v1/units/${unitId}/on-duty?at=2099-06-10T12:00:00Z`, readerToken)

      expect(reply.status).toBe(200)
      expect((reply.body as any[]).map((item) => [item.id, item.role])).toEqual([[first, 'staff'], [lead, 'team_leader']])
      expect((reply.body as any[])[0]).not.toHaveProperty('_id')
      expect((await call('GET', `/v1/units/${unitId}/on-duty`, readerToken)).body).toEqual([])
    })

    it('refuses on-duty without a token or the read permission, and answers 404 for a missing, malformed or foreign unit', async () => {
      expect((await call('GET', `/v1/units/${unitId}/on-duty`)).status).toBe(401)
      expect((await call('GET', `/v1/units/${unitId}/on-duty`, unlinkedToken)).status).toBe(403)
      for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
        expect((await call('GET', `/v1/units/${id}/on-duty`, readerToken)).body).toMatchObject({ code: 'unit_not_found' })
      }
      expect((await call('GET', `/v1/units/${unitId}/on-duty`, otherTenantToken)).status).toBe(404)
      expect((await call('GET', `/v1/units/${unitId}/on-duty?at=soon`, readerToken)).status).toBe(400)
    })

    it('answers my own shifts between two dates, with no permission, and refuses an account without an employee', async () => {
      const mine = await duty(meId, '2099-06-12', 8, 16)
      await duty(await addEmployee(), '2099-06-12', 8, 16)

      const reply = await call('GET', '/v1/employees/me/roster?from=2099-06-10&to=2099-06-15', meToken)

      expect(reply.status).toBe(200)
      expect((reply.body as any[]).map((item) => item.id)).toContain(mine)
      expect((reply.body as any[]).every((item) => item.employee_id === meId)).toBe(true)
      expect((await call('GET', '/v1/employees/me/roster?from=2099-06-10&to=2099-06-15')).status).toBe(401)
      const unlinked = await call('GET', '/v1/employees/me/roster?from=2099-06-10&to=2099-06-15', unlinkedToken)
      expect(unlinked.status).toBe(403)
      expect(unlinked.body).toMatchObject({ code: 'employee_required' })
    })

    it('refuses a bad range for my roster', async () => {
      for (const query of ['', 'from=2099-06-10', 'from=2099-02-30&to=2099-06-15', 'from=soon&to=2099-06-15']) {
        expect((await call('GET', `/v1/employees/me/roster?${query}`, meToken)).status).toBe(400)
      }
      expect((await call('GET', '/v1/employees/me/roster?from=2099-06-15&to=2099-06-10', meToken)).body).toMatchObject({ code: 'invalid_range' })
      expect((await call('GET', '/v1/employees/me/roster?from=2099-03-01&to=2099-05-03', meToken)).body).toMatchObject({ code: 'invalid_range' })
    })

    it('writes no log entry for either read, except the access log', async () => {
      const { written, restore } = captureLogs()
      try {
        const replies = [
          await call('GET', `/v1/units/${unitId}/on-duty`, readerToken),
          await call('GET', '/v1/employees/me/roster?from=2099-06-10&to=2099-06-15', meToken),
          await call('GET', '/v1/employees/me/roster?from=x&to=y', meToken),
        ]
        expect(replies.map((reply) => reply.status)).toEqual([200, 200, 400])
        await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length))
        expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
      } finally {
        restore()
      }
    })
  })

  it('refuses to retire a shift an open roster uses, and allows it once the assignment is cancelled', async () => {
    const used = await addShift('USED')
    const employeeId = await addEmployee()
    const assignment = (await add(employeeId, { date: '2099-03-20', shiftId: used })).body as Record<string, any>

    const refused = await call('POST', `/v1/shift-definitions/${used}/retire`, shiftToken, {})
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({ code: 'shift_in_use' })
    await call('POST', `/v1/roster-assignments/${assignment.id}/cancel`, writerToken, {})
    expect((await call('POST', `/v1/shift-definitions/${used}/retire`, shiftToken, {})).body).toMatchObject({ status: 'retired' })
  })

  it('validates the request: 400 for shape, and list limits', async () => {
    const employeeId = await addEmployee()
    const id = new Types.ObjectId().toHexString()

    expect((await call('POST', `/v1/rosters/${rosterId}/assignments`, writerToken, {})).status).toBe(400)
    expect((await add('bad')).status).toBe(400)
    expect((await add(employeeId, { date: '2099-02-30' })).status).toBe(400)
    expect((await add(employeeId, { shiftId: 'bad' })).status).toBe(400)
    expect((await add(employeeId, { role: 'boss' })).status).toBe(400)
    expect((await add(employeeId, { overtimeConsent: 'yes' })).status).toBe(400)
    expect((await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { role: 'boss' })).status).toBe(400)
    expect((await call('PATCH', `/v1/roster-assignments/${id}`, writerToken, { version: -1 })).status).toBe(400)
    expect((await call('POST', `/v1/roster-assignments/${id}/cancel`, writerToken, { version: 'x' })).status).toBe(400)
    for (const query of ['limit=0', 'limit=501', 'offset=-1', 'status=gone', 'employeeId=bad', 'date=2099-02-30', 'from=soon']) {
      expect((await call('GET', `/v1/rosters/${rosterId}/assignments?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const { written, restore } = captureLogs()
    try {
      const replies = [
        await call('GET', `/v1/rosters/${rosterId}/assignments`, readerToken),
        await call('GET', '/v1/rosters/bad/assignments', readerToken),
        await call('GET', `/v1/rosters/${rosterId}/assignments?limit=0`, readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 404, 400])
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual([])
    } finally {
      restore()
    }
  })

  it('logs one entry per write, without employees, dates or reasons', async () => {
    const employeeId = await addEmployee()
    const { written, restore } = captureLogs()
    try {
      const created = (await add(employeeId, { date: '2099-03-24', reason: 'Alasan Rahasia' })).body as Record<string, any>
      await call('PATCH', `/v1/roster-assignments/${created.id}`, writerToken, { role: 'supervisor', reason: 'Alasan Ubah Rahasia' })
      await call('POST', `/v1/roster-assignments/${created.id}/cancel`, writerToken, { reason: 'Alasan Batal Rahasia' })
      await vi.waitFor(() =>
        expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3),
      )

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual([
        'assignment_add',
        'assignment_change',
        'assignment_cancel',
      ])
      for (const text of [employeeId, '2099-03-24', 'Alasan Rahasia', 'Alasan Ubah Rahasia', 'Alasan Batal Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
