import { Types } from 'mongoose'
import { runWithRequestContext } from '@utility/logger/context'
import { type AppLogger } from '@utility/logger/service'
import { type Employee } from '@repository/model/employee'
import { type PracticeSchedule } from '@repository/model/practice-schedule'
import { type CodeConceptService } from '../concept/code-concept.service'
import { type EligibilityService } from '../eligibility/eligibility.service'
import {
  InMemoryEmployees,
  InMemoryFacilities,
  InMemoryOrganizationUnits,
  InMemoryPracticeScheduleExceptions,
  InMemoryPracticeSchedules,
  InMemoryLeaveRequests,
} from '../testing/in-memory'
import { LeaveCalendar } from '../leave/leave-calendar'
import { InvalidRequestError } from '../workforce.error'
import { PracticeExceptionService } from './practice-exception.service'
import { PracticeScheduleService } from './practice-schedule.service'

describe('PracticeExceptionService', () => {
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  const organizationId = new Types.ObjectId().toHexString()
  const log = vi.fn()
  const warn = vi.fn()
  const error = vi.fn()
  const debug = vi.fn()
  const general = vi.fn()
  const assertActive = vi.fn()
  let schedules: InMemoryPracticeSchedules
  let exceptions: InMemoryPracticeScheduleExceptions
  let units: InMemoryOrganizationUnits
  let facilities: InMemoryFacilities
  let employees: InMemoryEmployees
  let service: PracticeExceptionService
  let leaveRequests: InMemoryLeaveRequests
  let sessionsService: PracticeScheduleService
  let eligible: { value: { eligible: true } | { eligible: false; failed: string } }
  let facilityId: string
  let unitId: string
  let doctor: Employee
  let monday: PracticeSchedule

  // 2099-03-02, 09 and 16 are Mondays; 2099-03-03 and 10 are Tuesdays.
  const leave = { system: 'id.practice-exception-reason', code: 'leave' }

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
   * Adds a clinical Tenaga Medis.
   *
   * @param number - Employee number.
   * @returns The employee.
   */
  function addDoctor(number: string) {
    return asHead(() =>
      employees.create({
        tenant_id: tenantId,
        employee_number: number,
        name: { use: 'official', text: 'dr. Siti', given: [], prefix: [], suffix: [] },
        other_names: [],
        display_name: 'dr. Siti',
        administrative_gender: null,
        workforce_category: { system: 'id.workforce-category', code: 'tenaga_medis' },
        is_clinical: true,
        profession: { system: 'id.profession', code: 'dokter' },
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
      }),
    )
  }

  /**
   * Adds a polyclinic.
   *
   * @returns The unit.
   */
  function addUnit() {
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
        is_clinical: true,
        external_ids: [],
        period: { start: '2026-01-01', end: null },
        status: 'active',
      }),
    )
  }

  /**
   * Stores a schedule directly.
   *
   * @param override - Fields that replace the defaults of a Monday 08:00 to 12:00 schedule.
   * @returns The schedule.
   */
  function addSchedule(override: Partial<PracticeSchedule> = {}) {
    return asHead(() =>
      schedules.create({ tenant_id: tenantId, employee_id: doctor.id, unit_id: unitId, facility_id: facilityId, day_of_week: 1, start_time: '08:00', end_time: '12:00', quota: 30, period: { start: '2099-03-01', end: null }, status: 'active', ...override }),
    )
  }

  /**
   * Makes an exception as the Head of the polyclinic.
   *
   * @param input - The exception.
   * @param on - The schedule; the Monday schedule by default.
   * @returns The exception.
   */
  function make(input: Record<string, unknown>, on: PracticeSchedule = monday) {
    return asHead(() => service.create(tenantId, on.id, { date: '2099-03-09', kind: 'cancelled', reason: leave, ...input } as never))
  }

  /**
   * Stores a leave request of an employee on one date.
   *
   * @param employeeId - The employee.
   * @param date - The date.
   * @param status - Request status.
   * @param count - What the day counts.
   * @returns The request.
   */
  function onLeave(employeeId: string, date: string, status: 'approved' | 'requested' = 'approved', count: 0.5 | 1 = 1) {
    return asHead(() =>
      leaveRequests.create({ tenant_id: tenantId, employee_id: employeeId, status, period: { start: date, end: date }, days: [{ date, count, why: 'working', set_by: 'working_week' }] } as never),
    )
  }

  beforeEach(async () => {
    vi.resetAllMocks()
    eligible = { value: { eligible: true } }
    general.mockImplementation(async () => eligible.value)
    assertActive.mockResolvedValue(undefined)
    schedules = new InMemoryPracticeSchedules()
    exceptions = new InMemoryPracticeScheduleExceptions()
    units = new InMemoryOrganizationUnits()
    facilities = new InMemoryFacilities()
    employees = new InMemoryEmployees()
    const logger = { log, warn, error, debug } as unknown as AppLogger
    const eligibility = { general } as unknown as EligibilityService
    leaveRequests = new InMemoryLeaveRequests()
    service = new PracticeExceptionService(exceptions, schedules, units, facilities, employees, eligibility, { assertActive } as unknown as CodeConceptService, new LeaveCalendar(leaveRequests), logger)
    sessionsService = new PracticeScheduleService(schedules, exceptions, units, facilities, employees, eligibility, logger)
    facilityId = (
      await asHead(() =>
        facilities.create({ tenant_id: tenantId, organization_id: organizationId, code: 'rs-sehat', name: [{ locale: 'en', text: 'RS' }], address: null, timezone: 'Asia/Jakarta', holiday_calendar_codes: [], external_ids: [], status: 'active' }),
      )
    ).id
    unitId = (await addUnit()).id
    doctor = await addDoctor('D001')
    monday = await addSchedule()
  })

  describe('create', () => {
    it('cancels a session, copies the doctor and the polyclinic, and logs one entry without values', async () => {
      const exception = await make({ date: '2099-03-09' })

      expect(exception).toMatchObject({ tenant_id: tenantId, schedule_id: monday.id, employee_id: doctor.id, unit_id: unitId, date: '2099-03-09', kind: 'cancelled', moved_to: null, reason: leave, source: { kind: 'manual', ref_id: null } })
      expect(assertActive).toHaveBeenCalledWith(tenantId, leave)
      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_exception_create', outcome: 'success' })
      for (const text of [doctor.id, '2099-03-09', 'leave']) {
        expect(JSON.stringify([log.mock.calls, warn.mock.calls])).not.toContain(text)
      }
    })

    it('moves a session to another time the same day, or to another date, checking the doctor on the new date', async () => {
      const sameDay = await make({ date: '2099-03-09', kind: 'moved', movedTo: { date: '2099-03-09', startTime: '09:00', endTime: '13:00' } })
      const elsewhere = await make({ date: '2099-03-16', kind: 'moved', movedTo: { date: '2099-03-18', startTime: '14:00', endTime: '16:00' } })

      expect(sameDay).toMatchObject({ kind: 'moved', moved_to: { date: '2099-03-09', start_time: '09:00', end_time: '13:00' } })
      expect(elsewhere.moved_to).toEqual({ date: '2099-03-18', start_time: '14:00', end_time: '16:00' })
      expect(general).toHaveBeenCalledWith(tenantId, expect.objectContaining({ id: doctor.id }), expect.objectContaining({ id: unitId }), '2099-03-18')
    })

    it('refuses a date that is not real, a kind that is not known, and a date in the past', async () => {
      expect(await rejection(() => make({ date: '2099-02-30' }))).toMatchObject({ code: 'invalid_date' })
      expect(await rejection(() => make({ kind: 'postponed' }))).toMatchObject({ code: 'invalid_kind' })
      expect(await rejection(() => make({ date: '2020-03-02' }))).toMatchObject({ code: 'date_in_past' })
      expect(await exceptions.findAll()).toEqual([])
    })

    it('needs a session on that date: the weekday and the period decide, and an ended schedule serves its days only', async () => {
      expect(await rejection(() => make({ date: '2099-03-10' }))).toMatchObject({ code: 'no_session_on_date' })
      expect(await rejection(() => make({ date: '2099-02-23' }))).toMatchObject({ code: 'no_session_on_date' })
      const ended = await addSchedule({ day_of_week: 2, period: { start: '2099-03-01', end: '2099-03-10' }, status: 'ended' })
      expect((await make({ date: '2099-03-10' }, ended)).kind).toBe('cancelled')
      expect(await rejection(() => make({ date: '2099-03-17' }, ended))).toMatchObject({ code: 'no_session_on_date' })
    })

    it('needs a reason code of the reason system that is active', async () => {
      expect(await rejection(() => make({ reason: { system: 'id.other', code: 'leave' } }))).toMatchObject({ code: 'invalid_exception_reason' })
      expect(await rejection(() => make({ reason: undefined }))).toMatchObject({ code: 'invalid_exception_reason' })
      assertActive.mockRejectedValueOnce(new InvalidRequestError('code_retired', 'retired'))
      expect(await rejection(() => make({}))).toMatchObject({ code: 'code_retired' })
      expect(await exceptions.findAll()).toEqual([])
    })

    it('needs a new time to move, refuses one to cancel, and checks it', async () => {
      const ok = { date: '2099-03-09', startTime: '09:00', endTime: '10:00' }
      expect(await rejection(() => make({ kind: 'moved' }))).toMatchObject({ code: 'moved_to_required' })
      expect(await rejection(() => make({ kind: 'cancelled', movedTo: ok }))).toMatchObject({ code: 'moved_to_not_allowed' })
      for (const [code, movedTo] of [
        ['invalid_date', { ...ok, date: '2099-02-30' }],
        ['date_in_past', { ...ok, date: '2020-03-02' }],
        ['invalid_times', { ...ok, startTime: '12:00', endTime: '09:00' }],
        ['invalid_times', { ...ok, startTime: '21:00', endTime: '07:00' }],
        ['not_moved', { date: '2099-03-09', startTime: '08:00', endTime: '12:00' }],
      ] as const) {
        expect(await rejection(() => make({ kind: 'moved', movedTo }))).toMatchObject({ code })
      }
    })

    it('answers one exception per schedule and date, and allows a new one after an undo', async () => {
      const first = await make({})
      expect(await rejection(() => make({ kind: 'moved', movedTo: { date: '2099-03-09', startTime: '09:00', endTime: '10:00' } }))).toMatchObject({ code: 'exception_exists' })
      await asHead(() => service.undo(tenantId, first.id, {}))
      expect((await make({})).id).not.toBe(first.id)
    })

    it('answers not found for a missing, malformed or foreign schedule, and a stale schedule version', async () => {
      const foreign = await asHead(() => schedules.create(Object.assign({}, monday, { tenant_id: otherTenantId }) as never))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad']) {
        expect(await rejection(() => asHead(() => service.create(tenantId, id, { date: '2099-03-09', kind: 'cancelled', reason: leave })))).toMatchObject({ code: 'schedule_not_found' })
      }
      expect(await rejection(() => make({ version: monday.version + 5 }))).toMatchObject({ code: 'stale_version' })
    })

    it('needs the doctor to be eligible on the new date of a moved session', async () => {
      eligible.value = { eligible: false, failed: 'sip' }
      const movedTo = { date: '2099-03-11', startTime: '09:00', endTime: '10:00' }

      expect(await rejection(() => make({ kind: 'moved', movedTo }))).toMatchObject({ code: 'not_eligible_sip' })
      expect((await make({ kind: 'cancelled' })).kind).toBe('cancelled')
    })

    it('refuses to move a session onto a day on which the doctor is on approved leave, but not onto a half day, and still cancels', async () => {
      await onLeave(doctor.id, '2099-03-11')
      await onLeave(doctor.id, '2099-03-12', 'approved', 0.5)

      expect(await rejection(() => make({ kind: 'moved', movedTo: { date: '2099-03-11', startTime: '09:00', endTime: '10:00' } }))).toMatchObject({ kind: 'invalid', code: 'on_leave' })
      expect((await make({ kind: 'moved', movedTo: { date: '2099-03-12', startTime: '09:00', endTime: '10:00' } })).kind).toBe('moved')
    })

    it('never puts the doctor in two places: a moved session must not overlap another of theirs that day', async () => {
      await addSchedule({ day_of_week: 2, start_time: '09:00', end_time: '13:00' })
      const toTuesday = (startTime: string, endTime: string) => ({ kind: 'moved', movedTo: { date: '2099-03-10', startTime, endTime } })

      expect(await rejection(() => make(toTuesday('10:00', '11:00')))).toMatchObject({ code: 'schedule_overlaps' })
      expect((await make({ date: '2099-03-02', ...toTuesday('13:00', '14:00') })).kind).toBe('moved')
      expect(await rejection(() => make({ date: '2099-03-16', ...toTuesday('13:30', '15:00') }))).toMatchObject({ code: 'schedule_overlaps' })
      expect(await rejection(() => make({ date: '2099-03-16', kind: 'moved', movedTo: { date: '2099-03-09', startTime: '09:00', endTime: '10:00' } }))).toMatchObject({ code: 'schedule_overlaps' })
    })

    it('lets a session move inside its own date, and onto a time freed by a cancelled session', async () => {
      const tuesday = await addSchedule({ day_of_week: 2, start_time: '09:00', end_time: '13:00' })
      expect((await make({ kind: 'moved', movedTo: { date: '2099-03-09', startTime: '09:00', endTime: '13:00' } })).kind).toBe('moved')
      await make({ date: '2099-03-10' }, tuesday)
      expect((await make({ date: '2099-03-02', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '10:00', endTime: '11:00' } })).kind).toBe('moved')
    })

    it('logs a failure with its code and no values', async () => {
      await rejection(() => make({ date: '2099-03-10' }))

      expect(warn.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_exception_create', outcome: 'failure', code: 'no_session_on_date' })
      expect(JSON.stringify(warn.mock.calls)).not.toContain('2099-03-10')
    })
  })

  describe('undo', () => {
    it('soft-deletes the exception, answers it as it was, and brings the session back', async () => {
      const exception = await make({})
      log.mockClear()

      const undone = await asHead(() => service.undo(tenantId, exception.id, { reason: 'Salah input' }))

      expect(undone).toMatchObject({ id: exception.id, kind: 'cancelled', date: '2099-03-09' })
      expect(await exceptions.findOne(exception.id)).toBeNull()
      expect((await exceptions.findOne(exception.id, { withSoft: true }))?.deleted_at).toBeTruthy()
      expect((await sessionsService.sessions(tenantId, { date: '2099-03-09' }))[0]).toMatchObject({ state: 'scheduled' })
      expect(log.mock.calls[0]?.[0]).toMatchObject({ event: 'practice_exception_cancel', outcome: 'success' })
      expect(JSON.stringify(log.mock.calls)).not.toContain('Salah input')
    })

    it('answers not found for a missing, malformed, foreign or already undone exception', async () => {
      const exception = await make({})
      const foreign = await asHead(() => exceptions.create(Object.assign({}, exception, { tenant_id: otherTenantId }) as never))
      await asHead(() => service.undo(tenantId, exception.id, {}))
      for (const id of [foreign.id, new Types.ObjectId().toHexString(), 'bad', exception.id]) {
        expect(await rejection(() => asHead(() => service.undo(tenantId, id, {})))).toMatchObject({ code: 'exception_not_found' })
      }
    })

    it('refuses a date in the past and a stale version', async () => {
      const exception = await make({})
      expect(await rejection(() => asHead(() => service.undo(tenantId, exception.id, { version: exception.version + 5 })))).toMatchObject({ code: 'stale_version' })
      const past = await asHead(() => exceptions.create({ tenant_id: tenantId, schedule_id: monday.id, employee_id: doctor.id, unit_id: unitId, date: '2020-03-02', kind: 'cancelled', moved_to: null, reason: leave, source: { kind: 'manual', ref_id: null } }))
      expect(await rejection(() => asHead(() => service.undo(tenantId, past.id, {})))).toMatchObject({ code: 'date_in_past' })
      expect(await exceptions.findOne(past.id)).not.toBeNull()
    })

    it('refuses to bring a session back onto a time the doctor now uses', async () => {
      const tuesday = await addSchedule({ day_of_week: 2, start_time: '09:00', end_time: '13:00' })
      const cancelled = await make({ date: '2099-03-10' }, tuesday)
      await make({ date: '2099-03-02', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '10:00', endTime: '11:00' } })

      expect(await rejection(() => asHead(() => service.undo(tenantId, cancelled.id, {})))).toMatchObject({ code: 'schedule_overlaps' })
      expect(await exceptions.findOne(cancelled.id)).not.toBeNull()
    })

    it('lets a moved session go back to its date even when it was moved within the same date', async () => {
      const moved = await make({ kind: 'moved', movedTo: { date: '2099-03-09', startTime: '09:00', endTime: '13:00' } })

      expect((await asHead(() => service.undo(tenantId, moved.id, {}))).id).toBe(moved.id)
    })
  })

  describe('the sessions of a date with exceptions', () => {
    it('shows a cancelled session, a moved one with where it went, and a moved-in one at its new time', async () => {
      const second = await addSchedule({ start_time: '13:00', end_time: '15:00' })
      const tuesday = await addSchedule({ day_of_week: 2, start_time: '09:00', end_time: '10:00', quota: 5 })
      await make({ date: '2099-03-09' })
      await make({ date: '2099-03-09', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '16:00', endTime: '17:00' } }, second)
      log.mockClear()

      const monday9 = await sessionsService.sessions(tenantId, { date: '2099-03-09' })
      const tuesday10 = await sessionsService.sessions(tenantId, { date: '2099-03-10' })

      expect(monday9.map((item) => [item.startTime, item.state])).toEqual([['08:00', 'cancelled'], ['13:00', 'moved']])
      expect(monday9[1]).toMatchObject({ movedTo: { date: '2099-03-10', startTime: '16:00', endTime: '17:00' }, scheduleId: second.id })
      expect(monday9[0]?.movedTo).toBeNull()
      expect(tuesday10.map((item) => [item.startTime, item.endTime, item.state, item.scheduleId])).toEqual([['09:00', '10:00', 'scheduled', tuesday.id], ['16:00', '17:00', 'moved_in', second.id]])
      expect(tuesday10[1]).toMatchObject({ date: '2099-03-10', quota: 30, employeeId: doctor.id, eligible: true, movedTo: null })
      expect(log).not.toHaveBeenCalled()
    })

    it('filters the moved-in sessions by polyclinic and doctor, and pages the merged list', async () => {
      const otherUnit = (await addUnit()).id
      const other = await addDoctor('D002')
      const second = await addSchedule({ unit_id: otherUnit, employee_id: other.id, start_time: '14:00', end_time: '16:00' })
      await make({ date: '2099-03-09', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '10:00', endTime: '11:00' } }, second)
      await make({ date: '2099-03-09', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '12:00', endTime: '13:00' } })

      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10', unitId: otherUnit })).toEqual([expect.objectContaining({ scheduleId: second.id, state: 'moved_in' })])
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10', employeeId: doctor.id })).toEqual([expect.objectContaining({ scheduleId: monday.id, state: 'moved_in' })])
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10' })).toHaveLength(2)
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10', limit: 1, offset: 1 })).toHaveLength(1)
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10', limit: 1 })).toHaveLength(1)
    })

    it('shows a moved-in session as not eligible when the doctor is not eligible on that date, and leaves out an undone exception', async () => {
      const exception = await make({ date: '2099-03-09', kind: 'moved', movedTo: { date: '2099-03-10', startTime: '10:00', endTime: '11:00' } })
      eligible.value = { eligible: false, failed: 'str' }
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10' })).toEqual([expect.objectContaining({ state: 'moved_in', eligible: false, failed: 'str' })])
      await asHead(() => service.undo(tenantId, exception.id, {}))
      expect(await sessionsService.sessions(tenantId, { date: '2099-03-10' })).toEqual([])
    })
  })
})
