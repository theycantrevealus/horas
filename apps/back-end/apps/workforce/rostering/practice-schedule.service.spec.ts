import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Employee } from '@repository/model/employee'
import { type PracticeSchedule } from '@repository/model/practice-schedule'
import { type EligibilityService } from '../eligibility/eligibility.service'
import {
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPracticeScheduleExceptions,
  InMemoryPracticeSchedules,
  InMemorySeparations,
} from '../testing/in-memory'
import { SeparationCalendar } from '../separation/separation-calendar'
import { PracticeScheduleService } from './practice-schedule.service'

describe('PracticeScheduleService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const general = vi.fn()
  let schedules: InMemoryPracticeSchedules
  let exceptions: InMemoryPracticeScheduleExceptions
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let employees: InMemoryEmployees
  let service: PracticeScheduleService
  let separations: InMemorySeparations
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let facilityId: string
  let unitId: string
  let doctor: Employee

  // 2099-03-02 is a Monday.
  const valid = { dayOfWeek: 1, startTime: '08:00', endTime: '12:00', validFrom: '2099-03-01' }

  /**
   * Runs `work` as a signed-in request.
   *
   * @param work - Code to run.
   * @returns What `work` returns.
   */
  function asHead<T>(work: () => Promise<T>): Promise<T> {
    return runWithRequestContext({ correlationId: 'c1', actor: { account_id: 'head', display_name: 'Head', kind: 'account' } }, work)
  }

  /**
   * Captures the rejection of a call.
   *
   * @param work - The call.
   * @returns The thrown error.
   */
  async function rejection(work: () => Promise<unknown>) {
    try {
      await work()
    } catch (thrown: unknown) {
      return thrown
    }
    return undefined
  }

  /**
   * Adds an employee.
   *
   * @param number - Employee number.
   * @param override - Fields that replace the defaults of a clinical Tenaga Medis.
   * @param tenant - Tenant of the employee.
   * @returns The employee.
   */
  function addEmployee(number: string, override: Partial<Employee> = {}, tenant = tenantId) {
    return asHead(() =>
      employees.create({
        tenant_id: tenant,
        employee_number: number,
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
        ...override,
      }),
    )
  }

  /**
   * Adds a unit of the facility.
   *
   * @param override - Status and clinical flag.
   * @returns The unit.
   */
  function addUnit(override: { is_clinical?: boolean; status?: 'active' | 'closed' } = {}) {
    return asHead(() =>
      units.create({
        tenant_id: tenantId,
        organization_id: organizationId,
        facility_id: facilityId,
        code: `u-${new Types.ObjectId().toHexString()}`,
        name: [{ locale: 'en', text: 'Poli' }],
        type: { system: 'id.unit-type', code: 'polyclinic' },
        parent_id: null,
        ancestor_ids: [],
        is_clinical: override.is_clinical ?? true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: override.status ?? 'active',
      }),
    )
  }

  /**
   * Adds a schedule through the service.
   *
   * @param override - Fields that replace the defaults.
   * @returns The schedule.
   */
  function add(override: Record<string, unknown> = {}) {
    return asHead(() => service.create(tenantId, { employeeId: doctor.id, unitId, ...valid, ...override }))
  }

  /**
   * Stores a separation of an employee.
   *
   * @param employeeId - The employee.
   * @param lastDay - The last working day.
   * @param status - Separation status.
   * @returns The separation.
   */
  function leaving(employeeId: string, lastDay: string, status: 'planned' | 'completed' | 'cancelled' = 'planned') {
    return asHead(() =>
      separations.create({ tenant_id: tenantId, employee_id: employeeId, last_working_day: lastDay, status } as never),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    eligible = { value: { eligible: true } }
    general.mockImplementation(async () => eligible.value)
    schedules = new InMemoryPracticeSchedules()
    exceptions = new InMemoryPracticeScheduleExceptions()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    employees = new InMemoryEmployees()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    separations = new InMemorySeparations()
    service = new PracticeScheduleService(schedules, exceptions, units, facilities, employees, { general } as unknown as EligibilityService, new SeparationCalendar(separations), logger)
    facilityId = (
      await asHead(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
    unitId = (await addUnit()).id
    doctor = await addEmployee('D001')
  })

  describe('create', () => {
    it('adds an active schedule with the polyclinic facility and no quota by default, and logs one entry without values', async () => {
      const schedule = await add()

      expect(schedule).toMatchObject({ tenant_id: tenantId, employee_id: doctor.id, unit_id: unitId, facility_id: facilityId, day_of_week: 1, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2099-03-01', end: null }, status: 'active' })
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_schedule_create', outcome: 'success' })
      for (const text of [doctor.id, '08:00', '2099-03-01']) {
        expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain(text)
      }
    })

    it('refuses a schedule that starts after the last working day of a doctor who is leaving, and accepts one that runs past it', async () => {
      await leaving(doctor.id, '2099-02-28')
      expect(await rejection(() => add())).toMatchObject({ kind: 'invalid', code: 'employee_leaving' })
      const other = await addEmployee('D002')
      await leaving(other.id, '2099-03-15')

      expect((await asHead(() => service.create(tenantId, { employeeId: other.id, unitId, ...valid }))).employee_id).toBe(other.id)
    })

    it('stores the quota and the end of the validity', async () => {
      expect(await add({ quota: 30, validUntil: '2099-06-30' })).toMatchObject({ quota: 30, period: { start: '2099-03-01', end: '2099-06-30' } })
    })

    it('checks the doctor on the first session date from the start of the validity', async () => {
      await add({ validFrom: '2099-03-03' })

      expect(general).toHaveBeenCalledWith(tenantId, expect.objectContaining({ id: doctor.id }), expect.objectContaining({ id: unitId }), '2099-03-09')
    })

    it('refuses a weekday, times, quota or validity that is not valid', async () => {
      for (const [code, override] of [
        ['invalid_day_of_week', { dayOfWeek: 0 }],
        ['invalid_day_of_week', { dayOfWeek: 8 }],
        ['invalid_times', { startTime: '12:00', endTime: '08:00' }],
        ['invalid_times', { startTime: '21:00', endTime: '07:00' }],
        ['invalid_times', { startTime: '08:00', endTime: '08:00' }],
        ['invalid_times', { startTime: '8:00' }],
        ['invalid_quota', { quota: 0 }],
        ['invalid_quota', { quota: 10000 }],
        ['invalid_period', { validFrom: '2099-02-30' }],
        ['invalid_period', { validFrom: '1999-01-01' }],
        ['invalid_period', { validUntil: '2099-02-28' }],
      ] as const) {
        expect(await rejection(() => add(override))).toMatchObject({ code })
      }
      expect(await schedules.findByFilter(tenantId)).toEqual([])
    })

    it('refuses a unit that is missing, foreign, closed or not clinical', async () => {
      const base = await units.findOne(unitId)
      const foreign = await asHead(() => units.create(Object.assign({}, base, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => add({ unitId: id }))).toMatchObject({ code: 'unit_not_found' })
      }
      const closed = await addUnit({ status: 'closed' })
      const plain = await addUnit({ is_clinical: false })
      expect(await rejection(() => add({ unitId: closed.id }))).toMatchObject({ code: 'unit_closed' })
      expect(await rejection(() => add({ unitId: plain.id }))).toMatchObject({ code: 'unit_not_clinical' })
    })

    it('refuses an employee that is missing, foreign, not a Tenaga Medis or cannot be assigned', async () => {
      const stranger = await addEmployee('D900', {}, otherTenantId)
      for (const id of [stranger.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => add({ employeeId: id }))).toMatchObject({ code: 'employee_not_found' })
      }
      const nurse = await addEmployee('N001', { workforce_category: { system: 'id.workforce-category', code: 'tenaga_keperawatan' } })
      const clerk = await addEmployee('C001', { is_clinical: false })
      expect(await rejection(() => add({ employeeId: nurse.id }))).toMatchObject({ code: 'not_tenaga_medis' })
      expect(await rejection(() => add({ employeeId: clerk.id }))).toMatchObject({ code: 'not_tenaga_medis' })
      const gone = await addEmployee('D002', { employment_status: 'separated' })
      expect(await rejection(() => add({ employeeId: gone.id }))).toMatchObject({ code: 'employee_not_assignable' })
    })

    it('refuses a doctor who is not clinically eligible, naming the condition, and a validity with no session', async () => {
      for (const failed of ['employment', 'str', 'sip', 'spk']) {
        eligible.value = { eligible: false, failed }
        expect(await rejection(() => add())).toMatchObject({ code: `not_eligible_${failed}` })
      }
      eligible.value = { eligible: true }
      expect(await rejection(() => add({ validFrom: '2099-03-03', validUntil: '2099-03-05' }))).toMatchObject({ code: 'no_session_in_period' })
      expect(await schedules.findByFilter(tenantId)).toEqual([])
    })

    it('never puts a doctor in two places: overlapping sessions are refused in any polyclinic, touching ones are not', async () => {
      await add()
      const other = (await addUnit()).id

      expect(await rejection(() => add({ startTime: '11:00', endTime: '14:00' }))).toMatchObject({ code: 'schedule_overlaps' })
      expect(await rejection(() => add({ unitId: other, startTime: '10:00', endTime: '11:00' }))).toMatchObject({ code: 'schedule_overlaps' })
      expect((await add({ unitId: other, startTime: '12:00', endTime: '14:00' })).status).toBe('active')
      expect((await add({ dayOfWeek: 2 })).day_of_week).toBe(2)
      const second = await addEmployee('D002')
      expect((await add({ employeeId: second.id })).employee_id).toBe(second.id)
    })

    it('lets a session start after another one ends, and counts an ended schedule until its last date', async () => {
      const first = await add({ validUntil: '2099-03-31' })
      expect((await add({ validFrom: '2099-04-01' })).status).toBe('active')
      await asHead(() => service.end(tenantId, first.id, { lastDate: '2099-03-20' }))
      expect(await rejection(() => add({ validFrom: '2099-03-10', validUntil: '2099-03-19' }))).toMatchObject({ code: 'schedule_overlaps' })
      expect((await add({ validFrom: '2099-03-21', validUntil: '2099-03-30' })).status).toBe('active')
    })

    it('logs a failure with its code and no values', async () => {
      await rejection(() => add({ dayOfWeek: 9 }))

      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_schedule_create', outcome: 'failure', code: 'invalid_day_of_week' })
    })
  })

  describe('update', () => {
    it('changes the times, the quota and the end of the validity of a schedule that has not started', async () => {
      const schedule = await add({ quota: 20 })

      const updated = await asHead(() => service.update(tenantId, schedule.id, { startTime: '09:00', endTime: '13:00', quota: 40, validFrom: '2099-03-08', validUntil: '2099-09-30' }))

      expect(updated).toMatchObject({ start_time: '09:00', end_time: '13:00', quota: 40, period: { start: '2099-03-08', end: '2099-09-30' }, employee_id: doctor.id, unit_id: unitId, day_of_week: 1 })
      expect(log.mock.calls.at(-1)?.[0]).toMatchObject({ event: 'practice_schedule_update', outcome: 'success' })
    })

    it('removes the quota and the end with null', async () => {
      const schedule = await add({ quota: 20, validUntil: '2099-09-30' })

      expect(await asHead(() => service.update(tenantId, schedule.id, { quota: null, validUntil: null }))).toMatchObject({ quota: null, period: { start: '2099-03-01', end: null } })
    })

    it('changes the times and the end of one that has started, but not its start', async () => {
      const started = await asHead(() => schedules.create({ tenant_id: tenantId, employee_id: doctor.id, unit_id: unitId, facility_id: facilityId, day_of_week: 3, start_time: '08:00', end_time: '12:00', quota: null, period: { start: '2000-01-01', end: null }, status: 'active' }))

      expect(await asHead(() => service.update(tenantId, started.id, { startTime: '09:00', endTime: '11:00', validUntil: '2099-12-31' }))).toMatchObject({ start_time: '09:00', period: { start: '2000-01-01', end: '2099-12-31' } })
      expect(await rejection(() => asHead(() => service.update(tenantId, started.id, { validFrom: '2000-02-01' })))).toMatchObject({ code: 'schedule_started' })
    })

    it('needs one field, and refuses invalid fields with the codes of create', async () => {
      const schedule = await add()
      expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, {})))).toMatchObject({ code: 'empty_update' })
      for (const [code, input] of [
        ['invalid_times', { startTime: '13:00' }],
        ['invalid_times', { endTime: '07:00' }],
        ['invalid_quota', { quota: 0 }],
        ['invalid_period', { validUntil: '2099-02-01' }],
        ['no_session_in_period', { validUntil: '2099-03-01' }],
      ] as const) {
        expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, input)))).toMatchObject({ code })
      }
    })

    it('checks the doctor and the overlap again when the times or the validity change, leaving the schedule itself out', async () => {
      const schedule = await add()
      await add({ startTime: '13:00', endTime: '15:00' })
      expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, { endTime: '14:00' })))).toMatchObject({ code: 'schedule_overlaps' })
      expect((await asHead(() => service.update(tenantId, schedule.id, { endTime: '12:30' }))).end_time).toBe('12:30')
      eligible.value = { eligible: false, failed: 'sip' }
      expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, { startTime: '07:00' })))).toMatchObject({ code: 'not_eligible_sip' })
      general.mockClear()
      expect((await asHead(() => service.update(tenantId, schedule.id, { quota: 5 }))).quota).toBe(5)
      expect(general).not.toHaveBeenCalled()
    })

    it('answers a stale version, not found for a missing, malformed or foreign schedule, and refuses an ended one', async () => {
      const schedule = await add()
      expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, { quota: 5, version: schedule.version + 5 })))).toMatchObject({ code: 'stale_version' })
      const foreign = await asHead(() => schedules.create(Object.assign({}, schedule, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.update(tenantId, id, { quota: 5 })))).toMatchObject({ code: 'schedule_not_found' })
      }
      await asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-03-31' }))
      expect(await rejection(() => asHead(() => service.update(tenantId, schedule.id, { quota: 5 })))).toMatchObject({ code: 'schedule_ended' })
    })
  })

  describe('end', () => {
    it('sets the last date and the status ended at once, and logs one entry without values', async () => {
      const schedule = await add()
      log.mockClear()

      const ended = await asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-04-30', reason: 'Dokter pindah' }))

      expect(ended).toMatchObject({ status: 'ended', period: { start: '2099-03-01', end: '2099-04-30' } })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_schedule_end', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('2099-04-30')
    })

    it('refuses a last date in the past, before the start, after the current end, or not a date', async () => {
      const schedule = await add({ validUntil: '2099-06-30' })
      for (const lastDate of ['2020-01-01', '2099-02-28', '2099-07-01', '2099-02-30', 'soon']) {
        expect(await rejection(() => asHead(() => service.end(tenantId, schedule.id, { lastDate })))).toMatchObject({ code: 'invalid_last_date' })
      }
      expect((await asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-06-30' }))).status).toBe('ended')
    })

    it('is final, checks the version, and answers not found for a missing, malformed or foreign schedule', async () => {
      const schedule = await add()
      expect(await rejection(() => asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-04-30', version: schedule.version + 5 })))).toMatchObject({ code: 'stale_version' })
      await asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-04-30' }))
      expect(await rejection(() => asHead(() => service.end(tenantId, schedule.id, { lastDate: '2099-04-30' })))).toMatchObject({ code: 'schedule_ended' })
      const foreign = await asHead(() => schedules.create(Object.assign({}, schedule, { tenant_id: otherTenantId, status: 'active' }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.end(tenantId, id, { lastDate: '2099-04-30' })))).toMatchObject({ code: 'schedule_not_found' })
      }
    })
  })

  describe('reads', () => {
    it('lists schedules with filters and paging, ordered, and writes no log entry', async () => {
      const second = (await addUnit()).id
      const other = await addEmployee('D002')
      await add({ startTime: '13:00', endTime: '15:00' })
      await add({ startTime: '08:00', endTime: '12:00', dayOfWeek: 2 })
      await add({ unitId: second, employeeId: other.id })
      const first = (await schedules.findByFilter(tenantId))[0]
      await asHead(() => schedules.create(Object.assign({}, first, { tenant_id: otherTenantId }) as never))
      log.mockClear()

      expect(await service.list(tenantId, {})).toHaveLength(3)
      expect(await service.list(tenantId, { unitId })).toHaveLength(2)
      expect((await service.list(tenantId, { unitId })).map((item) => item.day_of_week)).toEqual([1, 2])
      expect(await service.list(tenantId, { employeeId: other.id })).toHaveLength(1)
      expect(await service.list(tenantId, { status: 'ended' })).toEqual([])
      expect(await service.list(tenantId, { limit: 1, offset: 1 })).toHaveLength(1)
      expect(log).not.toHaveBeenCalled()
      expect(warn).not.toHaveBeenCalled()
    })

    it('answers the sessions of a date: the weekday and the period decide, ended schedules serve their days, nothing is logged', async () => {
      const morning = await add({ quota: 30 })
      await add({ startTime: '13:00', endTime: '15:00', quota: 10 })
      await add({ dayOfWeek: 2 })
      const ended = await add({ validFrom: '2099-03-01', startTime: '16:00', endTime: '18:00' })
      await asHead(() => service.end(tenantId, ended.id, { lastDate: '2099-03-09' }))
      await add({ validFrom: '2099-04-01', startTime: '19:00', endTime: '20:00' })
      log.mockClear()

      const monday = await service.sessions(tenantId, { date: '2099-03-09' })

      expect(monday.map((item) => item.startTime)).toEqual(['08:00', '13:00', '16:00'])
      expect(monday[0]).toMatchObject({ scheduleId: morning.id, employeeId: doctor.id, displayName: 'dr. Siti', specialties: [{ system: 'id.specialty', code: 'anak' }], unitId, facilityId, date: '2099-03-09', endTime: '12:00', quota: 30, state: 'scheduled', eligible: true, failed: null })
      expect(monday[1]?.quota).toBe(10)
      expect((await service.sessions(tenantId, { date: '2099-03-16' })).map((item) => item.startTime)).toEqual(['08:00', '13:00'])
      expect((await service.sessions(tenantId, { date: '2099-04-06' })).map((item) => item.startTime)).toEqual(['08:00', '13:00', '19:00'])
      expect(await service.sessions(tenantId, { date: '2099-02-23' })).toEqual([])
      expect((await service.sessions(tenantId, { date: '2099-03-03' })).map((item) => item.startTime)).toEqual(['08:00'])
      expect(log).not.toHaveBeenCalled()
    })

    it('marks a doctor who is no longer eligible on that date, reading the records now', async () => {
      await add()
      eligible.value = { eligible: false, failed: 'sip' }

      expect(await service.sessions(tenantId, { date: '2099-03-09' })).toEqual([expect.objectContaining({ eligible: false, failed: 'sip' })])
    })

    it('marks a session whose doctor or polyclinic cannot be read as not eligible', async () => {
      const schedule = await add()
      await asHead(() => employees.deleteSoft(doctor.id))

      expect(await service.sessions(tenantId, { date: '2099-03-09' })).toEqual([expect.objectContaining({ scheduleId: schedule.id, displayName: null, specialties: [], eligible: false, failed: 'employment' })])
    })

    it('filters the sessions by polyclinic and doctor, pages them, and refuses a date that is not real', async () => {
      const second = (await addUnit()).id
      const other = await addEmployee('D002')
      await add()
      await add({ unitId: second, employeeId: other.id })

      expect(await service.sessions(tenantId, { date: '2099-03-09', unitId: second })).toHaveLength(1)
      expect(await service.sessions(tenantId, { date: '2099-03-09', employeeId: doctor.id })).toHaveLength(1)
      expect(await service.sessions(tenantId, { date: '2099-03-09', limit: 1, offset: 1 })).toHaveLength(1)
      expect(await rejection(() => service.sessions(tenantId, { date: '2099-02-30' }))).toMatchObject({ code: 'invalid_date' })
    })

    it('does not show the sessions of another tenant', async () => {
      const schedule = await add()
      await asHead(() => schedules.create(Object.assign({}, schedule, { tenant_id: otherTenantId }) as never))

      expect(await service.sessions(tenantId, { date: '2099-03-09' })).toHaveLength(1)
      expect(await service.sessions(otherTenantId, { date: '2099-03-09' })).toEqual([expect.objectContaining({ eligible: false })])
    })
  })

  it('has the type of a stored schedule', async () => {
    const schedule: PracticeSchedule = await add()
    expect(schedule.status).toBe('active')
  })
})
