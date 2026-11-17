import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { HolidayManagementModule } from '../holiday/holiday-management.module'
import { HrImportManagementModule } from '../hr-import/hr-import-management.module'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { RosterImportManagementModule } from './roster-import-management.module'

describe('roster import and import endpoints (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  let gateway: HrGateway
  let call: HrGateway['call']
  let callRaw: HrGateway['callRaw']
  let importerToken: string
  let readerToken: string
  let cancellerToken: string
  let holidayToken: string
  let otherTenantToken: string
  let tenantId: string
  let otherTenantId: string
  let facilityId: string
  let unitId: string
  let rosterId: string
  let counter = 0
  const header = 'employee_number,date,shift_code,role,overtime_consent'

  // 2099-03-02 is a Monday.
  const file = (...rows: string[]) => `${header}\n${rows.join('\n')}\n`

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
   * Adds a draft roster of a new unit.
   *
   * @param status - The roster status.
   * @returns The roster identifier.
   */
  async function addRoster(status: 'draft' | 'published' = 'draft') {
    counter += 1
    const unit = (
      await workforce.units.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId,
        code: `ward-${counter}`,
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
    return (
      await workforce.rosters.create({
        tenant_id: tenantId,
        unit_id: unit,
        facility_id: facilityId,
        period: { start: '2099-03-01', end: '2099-03-31' },
        status,
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
  }

  /**
   * Sends a CSV file to the roster import route as the importer.
   *
   * @param id - Roster identifier.
   * @param text - The file.
   * @param query - Query string without the question mark.
   * @param token - Token to use; the importer's by default.
   * @returns The reply.
   */
  function upload(id: string, text: string, query = '', token = importerToken) {
    return callRaw('POST', `/v1/rosters/${id}/imports${query ? `?${query}` : ''}`, token, text, 'text/csv')
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
      modules: [RosterImportManagementModule, HrImportManagementModule, HolidayManagementModule],
      ...workforce.options,
    })
    call = gateway.call
    callRaw = gateway.callRaw
    ;({ tenantId, otherTenantId } = gateway)
    importerToken = await gateway.seedAndLogin(tenantId, 'importer', [PERMISSIONS.WORKFORCE_ROSTER_IMPORT])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_HR_IMPORT_READ])
    cancellerToken = await gateway.seedAndLogin(tenantId, 'canceller', [PERMISSIONS.WORKFORCE_HR_IMPORT_READ, PERMISSIONS.WORKFORCE_HR_IMPORT_CANCEL])
    holidayToken = await gateway.seedAndLogin(tenantId, 'holiday', [PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_READ, PERMISSIONS.WORKFORCE_HOLIDAY_CALENDAR_WRITE])
    otherTenantToken = await gateway.seedAndLogin(otherTenantId, 'other', [PERMISSIONS.WORKFORCE_ROSTER_IMPORT, PERMISSIONS.WORKFORCE_HR_IMPORT_READ, PERMISSIONS.WORKFORCE_HR_IMPORT_CANCEL])
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
    for (const [code, night] of [['P', false], ['M', true]] as const) {
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
    }
    for (const number of ['E001', 'E002']) {
      await addEmployee(number)
    }
    rosterId = await addRoster()
    unitId = (await workforce.rosters.findOne(rosterId))?.unit_id ?? ''
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and without the permission it needs (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    for (const [method, url] of [['POST', `/v1/rosters/${id}/imports`], ['GET', `/v1/hr-imports/${id}`], ['POST', `/v1/hr-imports/${id}/cancel`]] as const) {
      expect((await call(method, url, undefined, method === 'POST' ? {} : undefined)).status).toBe(401)
    }
    expect((await call('POST', `/v1/rosters/${id}/imports`, readerToken, {})).status).toBe(403)
    expect((await call('GET', `/v1/hr-imports/${id}`, importerToken)).status).toBe(403)
    expect((await call('POST', `/v1/hr-imports/${id}/cancel`, readerToken, {})).status).toBe(403)
    expect(unitId).toBeTruthy()
  })

  it('checks a file, records a validated import, and changes nothing in the roster', async () => {
    const checked = await upload(rosterId, file('E001,2099-03-02,P,,', 'E002,2099-03-02,M,team_leader,'))

    expect(checked.status).toBe(201)
    const record = checked.body as Record<string, any>
    expect(record).toMatchObject({
      kind: 'roster_assignments',
      target: { roster_id: rosterId },
      status: 'validated',
      counts: { rows: 2, valid: 2, invalid: 0, created: 2, updated: 0, skipped: 0 },
      errors: [],
      coverageGaps: 0,
      restDayGaps: 0,
    })
    expect(record.file.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(record).not.toHaveProperty('_id')
    expect(await workforce.rosterAssignments.findByRoster(tenantId, rosterId)).toEqual([])
    const viewed = await call('GET', `/v1/hr-imports/${record.id}`, readerToken)
    expect(viewed.status).toBe(200)
    expect(viewed.body).toMatchObject({ id: record.id, status: 'validated', counts: { created: 2 } })
    expect(viewed.body).not.toHaveProperty('coverageGaps')
  })

  it('records an invalid import with row errors as codes, and answers no preview', async () => {
    const checked = await upload(rosterId, file('E999,2099-03-02,P,,', 'E001,2099-02-30,P,,', 'E001,2099-03-03,NOPE,,'))

    expect(checked.status).toBe(201)
    expect(checked.body).toMatchObject({
      status: 'invalid',
      counts: { rows: 3, valid: 0, invalid: 3, created: 0 },
      errors: [
        { row: 2, column: 'employee_number', code: 'employee_not_found' },
        { row: 3, column: 'date', code: 'invalid_date' },
        { row: 4, column: 'shift_code', code: 'shift_not_found' },
      ],
      coverageGaps: null,
      restDayGaps: null,
    })
    expect(JSON.stringify(checked.body)).not.toContain('E999')
  })

  it('does not apply yet, and refuses a roster that is not a draft', async () => {
    const applied = await upload(rosterId, file('E001,2099-03-02,P,,'), `apply=true&checkId=${new Types.ObjectId().toHexString()}`)
    expect(applied.status).toBe(422)
    expect(applied.body).toMatchObject({ code: 'apply_not_available' })
    const locked = await upload(await addRoster('published'), file('E001,2099-03-02,P,,'))
    expect(locked.status).toBe(422)
    expect(locked.body).toMatchObject({ code: 'roster_locked' })
  })

  it('answers 422 for a file that cannot be read, 415 and 413 for the wrong type and size, and 404 for the roster', async () => {
    for (const [code, text] of [['empty_file', ''], ['invalid_header', 'employee_number,date\nE001,2099-03-02\n'], ['no_rows', `${header}\n`], ['invalid_csv', `${header}\nE001,2099-03-02\n`]] as const) {
      const reply = await upload(rosterId, text)
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code })
    }
    const json = await call('POST', `/v1/rosters/${rosterId}/imports`, importerToken, { employee_number: 'E001' })
    expect(json.status).toBe(422)
    expect(json.body).toMatchObject({ code: 'csv_required' })
    expect((await callRaw('POST', `/v1/rosters/${rosterId}/imports`, importerToken, 'x', 'application/octet-stream')).status).toBe(415)
    expect((await upload(rosterId, `${header}\n${'E001,2099-03-02,P,,\n'.repeat(30_000)}`)).status).toBe(413)
    for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
      expect((await upload(id, file('E001,2099-03-02,P,,'))).body).toMatchObject({ code: 'roster_not_found' })
    }
    expect((await upload(rosterId, file('E001,2099-03-02,P,,'), '', otherTenantToken)).status).toBe(404)
    for (const query of ['apply=maybe', 'checkId=bad', 'version=-1']) {
      expect((await upload(rosterId, file('E001,2099-03-02,P,,'), query)).status).toBe(400)
    }
  })

  it('cancels a checked import once, and refuses a second cancel, a stale version and a foreign import', async () => {
    const record = (await upload(rosterId, file('E001,2099-03-05,P,,'))).body as Record<string, any>

    const stale = await call('POST', `/v1/hr-imports/${record.id}/cancel`, cancellerToken, { version: record.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    const cancelled = await call('POST', `/v1/hr-imports/${record.id}/cancel`, cancellerToken, { reason: 'Salah berkas' })
    expect(cancelled.status).toBe(201)
    expect(cancelled.body).toMatchObject({ id: record.id, status: 'cancelled' })
    const again = await call('POST', `/v1/hr-imports/${record.id}/cancel`, cancellerToken, {})
    expect(again.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'invalid_transition' })
    expect((await call('POST', `/v1/hr-imports/${record.id}/cancel`, otherTenantToken, {})).status).toBe(404)
    expect((await call('GET', `/v1/hr-imports/${record.id}`, otherTenantToken)).status).toBe(404)
    expect((await call('POST', `/v1/hr-imports/${record.id}/cancel`, cancellerToken, { version: 'x' })).status).toBe(400)
  })

  it('views and cancels a holiday import too, and a cancelled check can no longer be applied', async () => {
    const calendar = (await call('POST', '/v1/holiday-calendars', holidayToken, { code: 'id-national', year: 2099, country: 'ID' })).body as Record<string, any>
    const holidays = 'date,kind,name_en\n2099-08-17,public,Independence Day\n'
    const checked = (await callRaw('POST', `/v1/holiday-calendars/${calendar.id}/imports`, holidayToken, holidays, 'text/csv')).body as Record<string, any>

    expect((await call('GET', `/v1/hr-imports/${checked.id}`, readerToken)).body).toMatchObject({ id: checked.id, kind: 'holiday_calendar', status: 'validated' })
    expect((await call('POST', `/v1/hr-imports/${checked.id}/cancel`, cancellerToken, {})).body).toMatchObject({ status: 'cancelled' })
    const applied = await callRaw('POST', `/v1/holiday-calendars/${calendar.id}/imports?apply=true&checkId=${checked.id}`, holidayToken, holidays, 'text/csv')
    expect(applied.status).toBe(422)
    expect(applied.body).toMatchObject({ code: 'check_not_valid' })
  })

  it('answers 404 for a missing or malformed import', async () => {
    for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
      expect((await call('GET', `/v1/hr-imports/${id}`, readerToken)).body).toMatchObject({ code: 'import_not_found' })
      expect((await call('POST', `/v1/hr-imports/${id}/cancel`, cancellerToken, {})).body).toMatchObject({ code: 'import_not_found' })
    }
  })

  it('writes no log entry for a view, and one entry per check and cancel without numbers, dates or reasons', async () => {
    const record = (await upload(rosterId, file('E001,2099-03-09,P,,'))).body as Record<string, any>
    const { written, restore } = captureLogs()
    try {
      await call('GET', `/v1/hr-imports/${record.id}`, readerToken)
      await upload(rosterId, file('E002,2099-03-10,P,,'))
      await call('POST', `/v1/hr-imports/${record.id}/cancel`, cancellerToken, { reason: 'Alasan Rahasia' })
      await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(3))

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual(['roster_import_check', 'hr_import_cancel'])
      for (const text of ['E001', 'E002', '2099-03-10', 'Alasan Rahasia']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
