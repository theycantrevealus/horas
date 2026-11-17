import { Logger } from '@nestjs/common'
import { Types } from 'mongoose'
import { PERMISSIONS } from '@identity/permission'
import { EligibilityService } from '@workforce/eligibility/eligibility.service'
import { createHrGateway, type HrGateway } from '../testing/hr-gateway'
import {
  createInMemoryWorkforce,
  type InMemoryWorkforce,
} from '../testing/in-memory-workforce'
import { PracticeScheduleManagementModule } from './practice-schedule-management.module'

describe('practice schedule routes (in-memory repositories)', () => {
  const workforce: InMemoryWorkforce = createInMemoryWorkforce()
  const eligible: { value: { eligible: true } | { eligible: false; failed: string } } = { value: { eligible: true } }
  let gateway: HrGateway
  let call: HrGateway['call']
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string
  let tenantId: string
  let facilityId: string
  let unitId: string
  let doctorId: string
  let counter = 0

  // 2099-03-02 is a Monday.
  const body = (override: Record<string, unknown> = {}) => ({ employeeId: doctorId, unitId, dayOfWeek: 1, startTime: '08:00', endTime: '12:00', validFrom: '2099-03-01', ...override })

  /**
   * Adds a clinical Tenaga Medis.
   *
   * @returns The employee identifier.
   */
  async function addDoctor() {
    counter += 1
    return (
      await workforce.employees.create({
        tenant_id: tenantId,
        employee_number: `D${counter}`,
        name: { use: 'official', text: 'dr. Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'dr. Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
        specialties: [{ coding: { system: 'id.specialty', code: 'anak' }, is_primary: true }],
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
   * Adds a clinical unit of the facility.
   *
   * @returns The unit identifier.
   */
  async function addUnit() {
    counter += 1
    return (
      await workforce.units.create({
        tenant_id: tenantId,
        organization_id: new Types.ObjectId().toHexString(),
        facility_id: facilityId,
        code: `poli-${counter}`,
        name: [{ locale: 'en', text: 'Poli' }],
        type: { system: 'id.unit-type', code: 'polyclinic' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
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
    gateway = await createHrGateway({
      modules: [PracticeScheduleManagementModule],
      overrides: [[EligibilityService, { general: async () => eligible.value }]],
      ...workforce.options,
    })
    call = gateway.call
    tenantId = gateway.tenantId
    writerToken = await gateway.seedAndLogin(tenantId, 'writer', [PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_READ, PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE])
    readerToken = await gateway.seedAndLogin(tenantId, 'reader', [PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_READ])
    otherTenantToken = await gateway.seedAndLogin(gateway.otherTenantId, 'other', [PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_READ, PERMISSIONS.WORKFORCE_PRACTICE_SCHEDULE_WRITE])
    facilityId = (
      await workforce.facilities.create({ tenant_id: tenantId, organization_id: new Types.ObjectId().toHexString(), code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' })
    ).id
    unitId = await addUnit()
    doctorId = await addDoctor()
  })

  afterAll(async () => {
    await gateway.close()
  })

  it('refuses every route without a token (401), and without the permission it needs (403)', async () => {
    const id = new Types.ObjectId().toHexString()
    for (const [method, url] of [['GET', '/v1/practice-schedules'], ['POST', '/v1/practice-schedules'], ['PATCH', `/v1/practice-schedules/${id}`], ['POST', `/v1/practice-schedules/${id}/end`]] as const) {
      expect((await call(method, url, undefined, method === 'GET' ? undefined : {})).status).toBe(401)
    }
    expect((await call('GET', '/v1/practice-schedules', await gateway.seedAndLogin(tenantId, 'nobody', []))).status).toBe(403)
    for (const [method, url] of [['POST', '/v1/practice-schedules'], ['PATCH', `/v1/practice-schedules/${id}`], ['POST', `/v1/practice-schedules/${id}/end`]] as const) {
      expect((await call(method, url, readerToken, {})).status).toBe(403)
    }
  })

  it('adds, lists, edits, reads the sessions of a date and ends a schedule over HTTP', async () => {
    const doctor = await addDoctor()
    const created = await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, quota: 30, dayOfWeek: 1 }))

    expect(created.status).toBe(201)
    const schedule = created.body as Record<string, any>
    expect(schedule).toMatchObject({ tenant_id: tenantId, employee_id: doctor, unit_id: unitId, facility_id: facilityId, day_of_week: 1, start_time: '08:00', end_time: '12:00', quota: 30, period: { start: '2099-03-01', end: null }, status: 'active' })
    expect(schedule).not.toHaveProperty('_id')

    const listed = await call('GET', `/v1/practice-schedules?employeeId=${doctor}&status=active`, readerToken)
    expect(listed.status).toBe(200)
    expect((listed.body as unknown as Record<string, any>[]).map((item) => item.id)).toEqual([schedule.id])

    const edited = await call('PATCH', `/v1/practice-schedules/${schedule.id}`, writerToken, { endTime: '13:00', quota: null, validUntil: '2099-12-31' })
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({ end_time: '13:00', quota: null, period: { start: '2099-03-01', end: '2099-12-31' } })

    const sessions = await call('GET', `/v1/practice-schedules?date=2099-03-09&employeeId=${doctor}`, readerToken)
    expect(sessions.status).toBe(200)
    expect(sessions.body).toEqual([expect.objectContaining({ scheduleId: schedule.id, employeeId: doctor, displayName: 'dr. Siti', specialties: [{ system: 'id.specialty', code: 'anak' }], unitId, date: '2099-03-09', startTime: '08:00', endTime: '13:00', quota: null, state: 'scheduled', eligible: true, failed: null })])

    const ended = await call('POST', `/v1/practice-schedules/${schedule.id}/end`, writerToken, { lastDate: '2099-03-31' })
    expect(ended.status).toBe(201)
    expect(ended.body).toMatchObject({ status: 'ended', period: { start: '2099-03-01', end: '2099-03-31' } })
    expect(((await call('GET', `/v1/practice-schedules?date=2099-03-30&employeeId=${doctor}`, readerToken)).body as unknown as unknown[])).toHaveLength(1)
    expect(((await call('GET', `/v1/practice-schedules?date=2099-04-06&employeeId=${doctor}`, readerToken)).body as unknown as unknown[])).toEqual([])
  })

  it('shows a doctor who is no longer eligible as not eligible in the sessions of a date', async () => {
    const doctor = await addDoctor()
    await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, dayOfWeek: 3 }))
    eligible.value = { eligible: false, failed: 'sip' }
    try {
      const sessions = await call('GET', `/v1/practice-schedules?date=2099-03-04&employeeId=${doctor}`, readerToken)
      expect(sessions.body).toEqual([expect.objectContaining({ eligible: false, failed: 'sip' })])
    } finally {
      eligible.value = { eligible: true }
    }
  })

  it('answers 422 for a rule that is broken, 409 for an overlap and a stale version, and 404 for unknown ids', async () => {
    const doctor = await addDoctor()
    const first = (await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, dayOfWeek: 2 }))).body as Record<string, any>
    const overlap = await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, dayOfWeek: 2, startTime: '11:00', endTime: '13:00', unitId: await addUnit() }))
    expect(overlap.status).toBe(409)
    expect(overlap.body).toMatchObject({ code: 'schedule_overlaps' })
    const stale = await call('PATCH', `/v1/practice-schedules/${first.id}`, writerToken, { quota: 5, version: first.version + 5 })
    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    for (const [code, override] of [['invalid_times', { startTime: '21:00', endTime: '07:00' }], ['invalid_quota', { quota: 0 }], ['unit_not_found', { unitId: new Types.ObjectId().toHexString() }], ['employee_not_found', { employeeId: new Types.ObjectId().toHexString() }], ['no_session_in_period', { validFrom: '2099-03-03', validUntil: '2099-03-05', dayOfWeek: 1 }]] as const) {
      const reply = await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, ...override }))
      expect(reply.status).toBe(422)
      expect(reply.body).toMatchObject({ code })
    }
    eligible.value = { eligible: false, failed: 'str' }
    try {
      expect((await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, dayOfWeek: 4 }))).body).toMatchObject({ code: 'not_eligible_str' })
    } finally {
      eligible.value = { eligible: true }
    }
    expect((await call('PATCH', `/v1/practice-schedules/${first.id}`, writerToken, {})).body).toMatchObject({ code: 'empty_update' })
    expect((await call('POST', `/v1/practice-schedules/${first.id}/end`, writerToken, { lastDate: '2020-01-01' })).body).toMatchObject({ code: 'invalid_last_date' })
    await call('POST', `/v1/practice-schedules/${first.id}/end`, writerToken, { lastDate: '2099-06-30' })
    expect((await call('PATCH', `/v1/practice-schedules/${first.id}`, writerToken, { quota: 5 })).body).toMatchObject({ code: 'schedule_ended' })
    for (const id of [new Types.ObjectId().toHexString(), 'bad']) {
      expect((await call('PATCH', `/v1/practice-schedules/${id}`, writerToken, { quota: 5 })).body).toMatchObject({ code: 'schedule_not_found' })
      expect((await call('POST', `/v1/practice-schedules/${id}/end`, writerToken, { lastDate: '2099-06-30' })).body).toMatchObject({ code: 'schedule_not_found' })
    }
    expect((await call('PATCH', `/v1/practice-schedules/${first.id}`, otherTenantToken, { quota: 5 })).status).toBe(404)
    expect(((await call('GET', '/v1/practice-schedules', otherTenantToken)).body as unknown as unknown[])).toEqual([])
  })

  it('answers 400 for a bad body or query', async () => {
    for (const bad of [{ employeeId: 'bad' }, { unitId: 'bad' }, { dayOfWeek: 0 }, { dayOfWeek: 8 }, { startTime: '8am' }, { endTime: 'noon' }, { validFrom: '2099-02-30' }, { validUntil: 'soon' }, { quota: 1.5 }, { reason: '' }, { reason: 'x'.repeat(501) }]) {
      expect((await call('POST', '/v1/practice-schedules', writerToken, body(bad))).status).toBe(400)
    }
    expect((await call('POST', '/v1/practice-schedules', writerToken, { unitId, dayOfWeek: 1, startTime: '08:00', endTime: '12:00', validFrom: '2099-03-01' })).status).toBe(400)
    const id = new Types.ObjectId().toHexString()
    expect((await call('PATCH', `/v1/practice-schedules/${id}`, writerToken, { startTime: '8am' })).status).toBe(400)
    expect((await call('PATCH', `/v1/practice-schedules/${id}`, writerToken, { version: -1 })).status).toBe(400)
    expect((await call('POST', `/v1/practice-schedules/${id}/end`, writerToken, {})).status).toBe(400)
    expect((await call('POST', `/v1/practice-schedules/${id}/end`, writerToken, { lastDate: 'soon' })).status).toBe(400)
    for (const query of ['date=2099-02-30', 'date=soon', 'unitId=bad', 'employeeId=bad', 'status=maybe', 'limit=0', 'limit=101', 'offset=-1']) {
      expect((await call('GET', `/v1/practice-schedules?${query}`, readerToken)).status).toBe(400)
    }
  })

  it('writes only the access log for a read, and one entry per write without doctors, dates, times or reasons', async () => {
    const doctor = await addDoctor()
    const { written, restore } = captureLogs()
    try {
      await call('GET', '/v1/practice-schedules', readerToken)
      await call('GET', '/v1/practice-schedules?date=2099-03-02', readerToken)
      const schedule = (await call('POST', '/v1/practice-schedules', writerToken, body({ employeeId: doctor, dayOfWeek: 5, reason: 'Alasan Rahasia' }))).body as Record<string, any>
      await call('PATCH', `/v1/practice-schedules/${schedule.id}`, writerToken, { startTime: '09:15' })
      await call('POST', `/v1/practice-schedules/${schedule.id}/end`, writerToken, { lastDate: '2099-07-31' })
      await vi.waitFor(() => expect(written.filter((entry) => entry.event === 'http_request')).toHaveLength(5))

      expect(written.filter((entry) => entry.event !== 'http_request').map((entry) => entry.event)).toEqual(['practice_schedule_create', 'practice_schedule_update', 'practice_schedule_end'])
      for (const text of ['Alasan Rahasia', doctor, '09:15', '2099-07-31']) {
        expect(JSON.stringify(written)).not.toContain(text)
      }
    } finally {
      restore()
    }
  })
})
