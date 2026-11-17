import { Inject, Injectable } from '@nestjs/common'
import {
  RepositoryConflictError,
  RepositoryNotFoundError,
} from '@utility/database/error'
import { withChangeReason } from '@utility/history/reason'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate, todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import {
  type PracticeScheduleOnDateQuery,
  type PracticeScheduleQuery,
  type PracticeScheduleRepository,
} from '@repository/interface/practice-schedule'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type Coding } from '@repository/model/common/coding'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type PracticeSchedule } from '@repository/model/practice-schedule'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_PRACTICE_SCHEDULE,
} from '@repository/token'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import { assertAssignable } from './assignment-checks'
import {
  areSessionTimes,
  firstSessionDate,
  isDayOfWeek,
  isoWeekday,
  isQuota,
  isSchedulePeriod,
  periodsShareDays,
  sessionsOverlap,
} from './practice-schedule-rules'

const NAME = 'PracticeScheduleService'

/**
 * The workforce category of a doctor (HR spec `HR-ROS-004`).
 */
const TENAGA_MEDIS: Coding = {
  system: 'id.workforce-category',
  code: 'tenaga_medis',
}

/**
 * Data of a new schedule.
 *
 * @property employeeId - The doctor.
 * @property unitId - The polyclinic.
 * @property dayOfWeek - ISO weekday, 1 to 7.
 * @property startTime - Local start `HH:mm`.
 * @property endTime - Local end `HH:mm`, after the start.
 * @property quota - Most patients per session, or missing for no limit.
 * @property validFrom - First day.
 * @property validUntil - Last day, or missing for open-ended.
 * @property reason - Why, kept in the change history.
 */
export interface CreatePracticeScheduleInput {
  employeeId: string
  unitId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  quota?: number | null
  validFrom: string
  validUntil?: string | null
  reason?: string
}

/**
 * Fields an edit can change. The doctor, the polyclinic and the weekday never change.
 *
 * @property startTime - New local start.
 * @property endTime - New local end.
 * @property quota - New quota; `null` removes the limit.
 * @property validFrom - New first day, only before the schedule has started.
 * @property validUntil - New last day; `null` makes it open-ended.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UpdatePracticeScheduleInput {
  startTime?: string
  endTime?: string
  quota?: number | null
  validFrom?: string
  validUntil?: string | null
  version?: number
  reason?: string
}

/**
 * Data of the end of a schedule.
 *
 * @property lastDate - The last day the schedule applies.
 * @property version - Version the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface EndPracticeScheduleInput {
  lastDate: string
  version?: number
  reason?: string
}

/**
 * Query of the sessions of one date.
 *
 * @property date - The local date.
 * @property unitId - Only this polyclinic.
 * @property employeeId - Only this doctor.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface SessionsQuery extends PracticeScheduleOnDateQuery {
  date: string
}

/**
 * One session of a date, as registration reads it (HR plan 5.8 PS2).
 *
 * @property scheduleId - The schedule.
 * @property employeeId - The doctor.
 * @property displayName - The doctor's name, public inside the hospital.
 * @property specialties - The doctor's specialties.
 * @property unitId - The polyclinic.
 * @property facilityId - Facility of the polyclinic.
 * @property date - The date.
 * @property startTime - Local start.
 * @property endTime - Local end.
 * @property quota - Most patients, or `null` for no limit.
 * @property state - `scheduled`, or (with exceptions) `cancelled`, `moved` or `moved_in`.
 * @property eligible - Whether the doctor is generally clinically eligible for the polyclinic on that date, read from the records now.
 * @property failed - The first condition that failed, or `null`.
 */
export interface PracticeSession {
  scheduleId: string
  employeeId: string
  displayName: string | null
  specialties: Coding[]
  unitId: string
  facilityId: string
  date: string
  startTime: string
  endTime: string
  quota: number | null
  state: 'scheduled' | 'cancelled' | 'moved' | 'moved_in'
  eligible: boolean
  failed: string | null
}

/**
 * The practice schedules of the outpatient polyclinics (HR plan 5.8, first code PR): list, the
 * sessions of a date for registration, add, edit and end. Only an eligible Tenaga Medis can have a
 * schedule (`HR-ROS-004`) and a doctor is never in two places at once. Nothing is deleted.
 */
@Injectable()
export class PracticeScheduleService {
  /**
   * @param schedules - Practice schedule repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param employees - Employee repository.
   * @param eligibility - General clinical eligibility.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_PRACTICE_SCHEDULE)
    private readonly schedules: PracticeScheduleRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Lists the schedules of the tenant, ordered by polyclinic, weekday and start time. Writes no
   * log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Optional filters and paging.
   * @returns The schedules.
   */
  list(
    tenantId: string,
    query: PracticeScheduleQuery,
  ): Promise<PracticeSchedule[]> {
    return this.schedules.findByFilter(tenantId, query)
  }

  /**
   * Answers the sessions of a date for registration: one per schedule whose weekday is the date's
   * and whose period covers it, ended schedules included, each with the doctor's eligibility on that
   * date read from the records now (HR plan 5.8 PS2). Writes no log entry (a read).
   *
   * @param tenantId - Tenant of the caller.
   * @param query - The date, optional filters and paging.
   * @returns The sessions, ordered by polyclinic, start time and doctor.
   * @throws InvalidRequestError `invalid_date`.
   */
  async sessions(
    tenantId: string,
    query: SessionsQuery,
  ): Promise<PracticeSession[]> {
    if (!isLocalDate(query.date)) {
      throw new InvalidRequestError(
        'invalid_date',
        'The date must be a real day written as YYYY-MM-DD.',
      )
    }
    const found = await this.schedules.findOnDate(
      tenantId,
      isoWeekday(query.date),
      query.date,
      query,
    )
    const employees = new Map<string, Employee | null>()
    const units = new Map<string, OrganizationUnit | null>()
    const sessions: PracticeSession[] = []
    for (const schedule of found) {
      if (!employees.has(schedule.employee_id)) {
        const employee = await this.employees.findOne(schedule.employee_id)
        employees.set(
          schedule.employee_id,
          employee && employee.tenant_id === tenantId ? employee : null,
        )
      }
      if (!units.has(schedule.unit_id)) {
        const unit = await this.units.findOne(schedule.unit_id)
        units.set(schedule.unit_id, unit && unit.tenant_id === tenantId ? unit : null)
      }
      const employee = employees.get(schedule.employee_id) ?? null
      const unit = units.get(schedule.unit_id) ?? null
      let eligible = false
      let failed: string | null = 'employment'
      if (employee && unit) {
        const result = await this.eligibility.general(
          tenantId,
          employee,
          unit,
          query.date,
        )
        eligible = result.eligible
        failed = result.eligible ? null : result.failed
      }
      sessions.push({
        scheduleId: schedule.id,
        employeeId: schedule.employee_id,
        displayName: employee?.display_name ?? null,
        specialties: employee?.specialties.map((item) => item.coding) ?? [],
        unitId: schedule.unit_id,
        facilityId: schedule.facility_id,
        date: query.date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        quota: schedule.quota,
        state: 'scheduled',
        eligible,
        failed,
      })
    }
    return sessions
  }

  /**
   * Adds a doctor's weekly session (HR plan 5.8 PS3 to PS7).
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The schedule.
   * @returns The created schedule, `active`.
   * @throws InvalidRequestError `invalid_day_of_week`, `invalid_times`, `invalid_quota`,
   * `invalid_period`, `unit_not_found`, `unit_closed`, `unit_not_clinical`, `employee_not_found`,
   * `not_tenaga_medis`, `employee_not_assignable`, `no_session_in_period` or `not_eligible_*`.
   * @throws ConflictError `schedule_overlaps`.
   */
  create(
    tenantId: string,
    input: CreatePracticeScheduleInput,
  ): Promise<PracticeSchedule> {
    return observe(
      this.logger,
      'practice_schedule_create',
      `${NAME}.create`,
      async () => {
        this.checkDay(input.dayOfWeek)
        this.checkTimes(input.startTime, input.endTime)
        const quota = this.checkQuota(input.quota)
        const period: DatePeriod = {
          start: input.validFrom,
          end: input.validUntil ?? null,
        }
        this.checkPeriod(period)
        const { unit, timeZone } = await this.loadPolyclinic(tenantId, input.unitId)
        const doctor = await this.loadDoctor(tenantId, input.employeeId)
        await this.checkEligible(
          tenantId,
          doctor,
          unit,
          input.dayOfWeek,
          period,
          todayInZone(timeZone),
        )
        await this.assertNoOverlap(tenantId, doctor.id, input.dayOfWeek, {
          start: input.startTime,
          end: input.endTime,
          period,
          ignoreId: undefined,
        })
        const write = (): Promise<PracticeSchedule> =>
          this.schedules.create({
            tenant_id: tenantId,
            employee_id: doctor.id,
            unit_id: unit.id,
            facility_id: unit.facility_id,
            day_of_week: input.dayOfWeek,
            start_time: input.startTime,
            end_time: input.endTime,
            quota,
            period,
            status: 'active',
          })
        return input.reason ? withChangeReason(input.reason, write) : write()
      },
    )
  }

  /**
   * Changes the times, the quota and the validity of an active schedule (HR plan 5.8 PS6). The
   * start of the validity can change only before the schedule has started.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Schedule identifier.
   * @param input - Fields to change, optional version and reason.
   * @returns The updated schedule.
   * @throws NotFoundError `schedule_not_found`.
   * @throws InvalidRequestError `schedule_ended`, `empty_update`, `schedule_started` and the codes
   * of `create` for the fields that are sent.
   * @throws ConflictError `schedule_overlaps` or `stale_version`.
   */
  update(
    tenantId: string,
    id: string,
    input: UpdatePracticeScheduleInput,
  ): Promise<PracticeSchedule> {
    return observe(
      this.logger,
      'practice_schedule_update',
      `${NAME}.update`,
      async () => {
        const schedule = await this.loadActive(tenantId, id)
        const fields = [
          input.startTime,
          input.endTime,
          input.quota,
          input.validFrom,
          input.validUntil,
        ]
        if (fields.every((value) => value === undefined)) {
          throw new InvalidRequestError(
            'empty_update',
            'Send at least one field to change.',
          )
        }
        const { unit, timeZone } = await this.loadPolyclinic(
          tenantId,
          schedule.unit_id,
          schedule.facility_id,
        )
        const today = todayInZone(timeZone)
        if (input.validFrom !== undefined && schedule.period.start <= today) {
          throw new InvalidRequestError(
            'schedule_started',
            'The start of a schedule that has started cannot change.',
          )
        }
        const start = input.startTime ?? schedule.start_time
        const end = input.endTime ?? schedule.end_time
        const period: DatePeriod = {
          start: input.validFrom ?? schedule.period.start,
          end:
            input.validUntil === undefined
              ? schedule.period.end
              : input.validUntil,
        }
        const changes: Partial<PracticeSchedule> = {}
        if (input.startTime !== undefined || input.endTime !== undefined) {
          this.checkTimes(start, end)
          changes.start_time = start
          changes.end_time = end
        }
        if (input.quota !== undefined) {
          changes.quota = this.checkQuota(input.quota)
        }
        const periodChanged =
          input.validFrom !== undefined || input.validUntil !== undefined
        if (periodChanged) {
          this.checkPeriod(period)
          changes.period = period
        }
        if (changes.start_time !== undefined || periodChanged) {
          const doctor = await this.loadDoctor(tenantId, schedule.employee_id)
          await this.checkEligible(
            tenantId,
            doctor,
            unit,
            schedule.day_of_week,
            period,
            today,
          )
          await this.assertNoOverlap(tenantId, doctor.id, schedule.day_of_week, {
            start,
            end,
            period,
            ignoreId: schedule.id,
          })
        }
        const write = (): Promise<PracticeSchedule> =>
          this.write(schedule, changes, input.version)
        return input.reason ? withChangeReason(input.reason, write) : write()
      },
    )
  }

  /**
   * Ends a schedule after a date (HR plan 5.8 PS8): the end of the period becomes the last date and
   * the status `ended` at once, so the sessions up to that date are still offered.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Schedule identifier.
   * @param input - The last date, optional version and reason.
   * @returns The ended schedule.
   * @throws NotFoundError `schedule_not_found`.
   * @throws InvalidRequestError `schedule_ended` or `invalid_last_date`.
   * @throws ConflictError `stale_version`.
   */
  end(
    tenantId: string,
    id: string,
    input: EndPracticeScheduleInput,
  ): Promise<PracticeSchedule> {
    return observe(
      this.logger,
      'practice_schedule_end',
      `${NAME}.end`,
      async () => {
        const schedule = await this.loadActive(tenantId, id)
        const { timeZone } = await this.loadPolyclinic(
          tenantId,
          schedule.unit_id,
          schedule.facility_id,
          false,
        )
        const last = input.lastDate
        if (
          !isLocalDate(last) ||
          last < todayInZone(timeZone) ||
          last < schedule.period.start ||
          (schedule.period.end !== null && last > schedule.period.end)
        ) {
          throw new InvalidRequestError(
            'invalid_last_date',
            'The last date must be today or later, inside the validity of the schedule.',
          )
        }
        const write = (): Promise<PracticeSchedule> =>
          this.write(
            schedule,
            { period: { start: schedule.period.start, end: last }, status: 'ended' },
            input.version,
          )
        return input.reason ? withChangeReason(input.reason, write) : write()
      },
    )
  }

  /**
   * Writes a change with the version it was read at.
   *
   * @param schedule - The schedule as read.
   * @param changes - The fields to change.
   * @param version - Version the caller sent, checked first.
   * @returns The updated schedule.
   * @throws ConflictError `stale_version`.
   */
  private async write(
    schedule: PracticeSchedule,
    changes: Partial<PracticeSchedule>,
    version: number | undefined,
  ): Promise<PracticeSchedule> {
    if (version !== undefined && version !== schedule.version) {
      throw this.stale()
    }
    try {
      return await this.schedules.update(schedule.id, changes, {
        expectedVersion: schedule.version,
      })
    } catch (error: unknown) {
      if (error instanceof RepositoryConflictError) {
        throw this.stale()
      }
      if (error instanceof RepositoryNotFoundError) {
        throw this.notFound()
      }
      throw error
    }
  }

  /**
   * Checks that a doctor is generally clinically eligible for the polyclinic on the first session
   * date from today or the start of the validity (HR plan 5.8 PS3).
   *
   * @param tenantId - Tenant of the caller.
   * @param doctor - The doctor.
   * @param unit - The polyclinic.
   * @param dayOfWeek - ISO weekday of the schedule.
   * @param period - Validity of the schedule.
   * @param today - Today in the polyclinic's zone.
   * @throws InvalidRequestError `no_session_in_period` or `not_eligible_*`.
   */
  private async checkEligible(
    tenantId: string,
    doctor: Employee,
    unit: OrganizationUnit,
    dayOfWeek: number,
    period: DatePeriod,
    today: string,
  ): Promise<void> {
    const date = firstSessionDate(dayOfWeek, period, today)
    if (date === null) {
      throw new InvalidRequestError(
        'no_session_in_period',
        'The validity has no session from today on.',
      )
    }
    const result = await this.eligibility.general(tenantId, doctor, unit, date)
    if (!result.eligible) {
      throw new InvalidRequestError(
        `not_eligible_${result.failed}`,
        'The doctor is not clinically eligible to practise in this polyclinic on that date.',
      )
    }
  }

  /**
   * Refuses a session that overlaps another of the same doctor on the same weekday in any
   * polyclinic, in periods that share a day (HR plan 5.8 PS7).
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The doctor.
   * @param dayOfWeek - ISO weekday.
   * @param session - Times, period and the schedule to leave out (the one being edited).
   * @throws ConflictError `schedule_overlaps`.
   */
  private async assertNoOverlap(
    tenantId: string,
    employeeId: string,
    dayOfWeek: number,
    session: {
      start: string
      end: string
      period: DatePeriod
      ignoreId: string | undefined
    },
  ): Promise<void> {
    const others = await this.schedules.findByEmployeeAndDay(
      tenantId,
      employeeId,
      dayOfWeek,
    )
    const clash = others.some(
      (other) =>
        other.id !== session.ignoreId &&
        periodsShareDays(other.period, session.period) &&
        sessionsOverlap(
          { start: other.start_time, end: other.end_time },
          { start: session.start, end: session.end },
        ),
    )
    if (clash) {
      throw new ConflictError(
        'schedule_overlaps',
        'The doctor already has a session that overlaps this one.',
      )
    }
  }

  /**
   * Loads a polyclinic of the caller's tenant: it must exist, be active and be clinical, and the
   * zone of its facility is read.
   *
   * @param tenantId - Tenant of the caller.
   * @param unitId - The unit as sent or stored.
   * @param facilityId - The facility stored on a schedule, if any.
   * @param strict - False to skip the active and clinical checks (reading the zone only).
   * @returns The unit and the IANA zone of its facility (`UTC` when it cannot be read).
   * @throws InvalidRequestError `unit_not_found`, `unit_closed` or `unit_not_clinical`.
   */
  private async loadPolyclinic(
    tenantId: string,
    unitId: string,
    facilityId?: string,
    strict = true,
  ): Promise<{ unit: OrganizationUnit; timeZone: string }> {
    const unit = await this.units.findOne(unitId)
    if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
      throw new InvalidRequestError('unit_not_found', 'The unit was not found.')
    }
    if (strict) {
      if (unit.status !== 'active') {
        throw new InvalidRequestError('unit_closed', 'The unit is closed.')
      }
      if (!unit.is_clinical) {
        throw new InvalidRequestError(
          'unit_not_clinical',
          'A practice schedule belongs to a clinical unit.',
        )
      }
    }
    const facility = await this.facilities.findOne(facilityId ?? unit.facility_id)
    return { unit, timeZone: facility?.timezone ?? 'UTC' }
  }

  /**
   * Loads the doctor of a schedule: an employee of the tenant who is a Tenaga Medis and can be
   * assigned.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee as sent or stored.
   * @returns The employee.
   * @throws InvalidRequestError `employee_not_found`, `not_tenaga_medis` or
   * `employee_not_assignable`.
   */
  private async loadDoctor(
    tenantId: string,
    employeeId: string,
  ): Promise<Employee> {
    const employee = await this.employees.findOne(employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    if (
      !employee.is_clinical ||
      employee.workforce_category.system !== TENAGA_MEDIS.system ||
      employee.workforce_category.code !== TENAGA_MEDIS.code
    ) {
      throw new InvalidRequestError(
        'not_tenaga_medis',
        'Only a Tenaga Medis can have a practice schedule.',
      )
    }
    assertAssignable(employee)
    return employee
  }

  /**
   * Loads an active schedule of the caller's tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Schedule identifier.
   * @returns The schedule.
   * @throws NotFoundError `schedule_not_found`.
   * @throws InvalidRequestError `schedule_ended`.
   */
  private async loadActive(
    tenantId: string,
    id: string,
  ): Promise<PracticeSchedule> {
    const schedule = await this.schedules.findOne(id)
    if (!schedule || schedule.tenant_id !== tenantId || schedule.deleted_at) {
      throw this.notFound()
    }
    if (schedule.status === 'ended') {
      throw new InvalidRequestError(
        'schedule_ended',
        'An ended schedule cannot be changed.',
      )
    }
    return schedule
  }

  /**
   * @param day - The weekday as sent.
   * @throws InvalidRequestError `invalid_day_of_week`.
   */
  private checkDay(day: unknown): void {
    if (!isDayOfWeek(day)) {
      throw new InvalidRequestError(
        'invalid_day_of_week',
        'The weekday must be a whole number from 1 (Monday) to 7 (Sunday).',
      )
    }
  }

  /**
   * @param start - Local start as sent.
   * @param end - Local end as sent.
   * @throws InvalidRequestError `invalid_times`.
   */
  private checkTimes(start: string, end: string): void {
    if (!areSessionTimes(start, end)) {
      throw new InvalidRequestError(
        'invalid_times',
        'The times must be HH:mm and the end must be after the start on the same day.',
      )
    }
  }

  /**
   * @param quota - The quota as sent.
   * @returns The quota, or `null` for no limit.
   * @throws InvalidRequestError `invalid_quota`.
   */
  private checkQuota(quota: number | null | undefined): number | null {
    if (quota === undefined || quota === null) {
      return null
    }
    if (!isQuota(quota)) {
      throw new InvalidRequestError(
        'invalid_quota',
        'The quota must be a whole number from 1 to 9999.',
      )
    }
    return quota
  }

  /**
   * @param period - The validity as sent.
   * @throws InvalidRequestError `invalid_period`.
   */
  private checkPeriod(period: DatePeriod): void {
    if (!isSchedulePeriod(period)) {
      throw new InvalidRequestError(
        'invalid_period',
        'The validity needs a real start from 2000-01-01 and an end that is empty or not before it.',
      )
    }
  }

  /**
   * @returns The not-found error for a schedule.
   */
  private notFound(): NotFoundError {
    return new NotFoundError(
      'schedule_not_found',
      'The practice schedule was not found.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The schedule was changed by someone else. Read it again and retry.',
    )
  }
}
