import { Inject, Injectable } from '@nestjs/common'
import { RepositoryNotFoundError } from '@utility/database/error'
import { AppLogger } from '@utility/logger/service'
import { isLocalDate, todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PracticeScheduleRepository } from '@repository/interface/practice-schedule'
import { type PracticeScheduleExceptionRepository } from '@repository/interface/practice-schedule-exception'
import { type Coding } from '@repository/model/common/coding'
import { type PracticeSchedule } from '@repository/model/practice-schedule'
import { type PracticeScheduleException } from '@repository/model/practice-schedule-exception'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_PRACTICE_SCHEDULE,
  REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION,
} from '@repository/token'
import { CodeConceptService } from '../concept/code-concept.service'
import { EligibilityService } from '../eligibility/eligibility.service'
import { observe } from '../observe'
import {
  ConflictError,
  InvalidRequestError,
  NotFoundError,
} from '../workforce.error'
import {
  areSessionTimes,
  isoWeekday,
  sessionsOverlap,
} from './practice-schedule-rules'

const NAME = 'PracticeExceptionService'

/**
 * The code system of the reason of an exception: leave, training, emergency, other.
 */
const REASON_SYSTEM = 'id.practice-exception-reason'

/**
 * Where a session goes.
 *
 * @property date - The new date.
 * @property startTime - The new local start.
 * @property endTime - The new local end.
 */
export interface MovedToInput {
  date: string
  startTime: string
  endTime: string
}

/**
 * Data of a new exception.
 *
 * @property date - The date of the session.
 * @property kind - `cancelled` or `moved`.
 * @property reason - A code of `id.practice-exception-reason`.
 * @property movedTo - Where the session goes; required for `moved`, refused for `cancelled`.
 * @property version - Version of the schedule the caller read.
 */
export interface CreateExceptionInput {
  date: string
  kind: 'cancelled' | 'moved'
  reason: Coding
  movedTo?: MovedToInput
  version?: number
}

/**
 * Optional version and reason of an undo.
 *
 * @property version - Version of the exception the caller read.
 * @property reason - Why, kept in the change history.
 */
export interface UndoExceptionInput {
  version?: number
  reason?: string
}

/**
 * The exceptions of practice schedules (HR plan 5.8 PS9 to PS11): one session on one date is
 * cancelled or moved (leave, training, emergency), and an exception can be undone. A moved session
 * follows the rules of a schedule: the doctor must still be eligible and never in two places.
 */
@Injectable()
export class PracticeExceptionService {
  /**
   * @param exceptions - Practice schedule exception repository.
   * @param schedules - Practice schedule repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param employees - Employee repository.
   * @param eligibility - General clinical eligibility.
   * @param concepts - Code concepts, for the reason.
   * @param logger - Logger of this service.
   */
  constructor(
    @Inject(REPOSITORY_PRACTICE_SCHEDULE_EXCEPTION)
    private readonly exceptions: PracticeScheduleExceptionRepository,
    @Inject(REPOSITORY_PRACTICE_SCHEDULE)
    private readonly schedules: PracticeScheduleRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
    @Inject(CodeConceptService) private readonly concepts: CodeConceptService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Cancels or moves one session of a schedule on a date.
   *
   * @param tenantId - Tenant of the caller.
   * @param scheduleId - Schedule identifier.
   * @param input - The exception.
   * @returns The created exception.
   * @throws NotFoundError `schedule_not_found`.
   * @throws InvalidRequestError `invalid_date`, `invalid_kind`, `date_in_past`, `no_session_on_date`,
   * `invalid_exception_reason`, `unknown_code`, `code_retired`, `moved_to_required`,
   * `moved_to_not_allowed`, `invalid_times`, `not_moved`, `employee_not_found`, `unit_not_found` or
   * `not_eligible_*`.
   * @throws ConflictError `exception_exists`, `schedule_overlaps` or `stale_version`.
   */
  create(
    tenantId: string,
    scheduleId: string,
    input: CreateExceptionInput,
  ): Promise<PracticeScheduleException> {
    return observe(
      this.logger,
      'practice_exception_create',
      `${NAME}.create`,
      async () => {
        const schedule = await this.loadSchedule(tenantId, scheduleId)
        if (input.version !== undefined && input.version !== schedule.version) {
          throw this.stale()
        }
        if (!isLocalDate(input.date)) {
          throw new InvalidRequestError(
            'invalid_date',
            'The date must be a real day written as YYYY-MM-DD.',
          )
        }
        if (input.kind !== 'cancelled' && input.kind !== 'moved') {
          throw new InvalidRequestError(
            'invalid_kind',
            'The kind must be cancelled or moved.',
          )
        }
        const today = await this.today(schedule)
        if (input.date < today) {
          throw this.inPast()
        }
        if (!this.hasSession(schedule, input.date)) {
          throw new InvalidRequestError(
            'no_session_on_date',
            'The schedule has no session on that date.',
          )
        }
        const reason = await this.checkReason(tenantId, input.reason)
        const movedTo = this.checkMovedTo(schedule, input, today)
        if (await this.exceptions.findByScheduleAndDate(tenantId, schedule.id, input.date)) {
          throw new ConflictError(
            'exception_exists',
            'The session of that date already has an exception.',
          )
        }
        if (movedTo) {
          await this.checkMove(tenantId, schedule, input.date, movedTo)
        }
        return this.exceptions.create({
          tenant_id: tenantId,
          schedule_id: schedule.id,
          employee_id: schedule.employee_id,
          unit_id: schedule.unit_id,
          date: input.date,
          kind: input.kind,
          moved_to: movedTo
            ? {
                date: movedTo.date,
                start_time: movedTo.startTime,
                end_time: movedTo.endTime,
              }
            : null,
          reason,
          source: { kind: 'manual', ref_id: null },
        })
      },
    )
  }

  /**
   * Undoes an exception: it is soft-deleted, so the session is back and the history keeps who undid
   * it (HR plan 5.8 PS11). The restored session must not overlap another session of the doctor.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Exception identifier.
   * @param input - Optional version and reason.
   * @returns The exception as it was.
   * @throws NotFoundError `exception_not_found`.
   * @throws InvalidRequestError `date_in_past`.
   * @throws ConflictError `stale_version` or `schedule_overlaps`.
   */
  undo(
    tenantId: string,
    id: string,
    input: UndoExceptionInput,
  ): Promise<PracticeScheduleException> {
    return observe(
      this.logger,
      'practice_exception_cancel',
      `${NAME}.undo`,
      async () => {
        const exception = await this.exceptions.findOne(id)
        if (
          !exception ||
          exception.tenant_id !== tenantId ||
          exception.deleted_at
        ) {
          throw new NotFoundError(
            'exception_not_found',
            'The exception was not found.',
          )
        }
        const schedule = await this.schedules.findOne(exception.schedule_id)
        const today = await this.today(schedule)
        if (exception.date < today) {
          throw this.inPast()
        }
        if (input.version !== undefined && input.version !== exception.version) {
          throw this.stale()
        }
        if (schedule && schedule.tenant_id === tenantId) {
          const others = await this.otherSessions(
            tenantId,
            exception.employee_id,
            exception.date,
            { scheduleId: undefined, exceptionId: exception.id },
          )
          if (
            others.some((other) =>
              sessionsOverlap(other, {
                start: schedule.start_time,
                end: schedule.end_time,
              }),
            )
          ) {
            throw this.overlaps()
          }
        }
        try {
          await this.exceptions.deleteSoft(exception.id)
        } catch (error: unknown) {
          if (error instanceof RepositoryNotFoundError) {
            throw new NotFoundError(
              'exception_not_found',
              'The exception was not found.',
            )
          }
          throw error
        }
        return exception
      },
    )
  }

  /**
   * Tells whether a schedule has a session on a date: the weekday matches and the period covers it.
   *
   * @param schedule - The schedule.
   * @param date - A real local date.
   * @returns True when there is a session.
   */
  private hasSession(schedule: PracticeSchedule, date: string): boolean {
    return (
      isoWeekday(date) === schedule.day_of_week &&
      schedule.period.start <= date &&
      (schedule.period.end === null || date <= schedule.period.end)
    )
  }

  /**
   * Checks the reason: a code of the reason system that is active.
   *
   * @param tenantId - Tenant of the caller.
   * @param reason - The code as sent.
   * @returns The cleaned code.
   * @throws InvalidRequestError `invalid_exception_reason`, `unknown_code`, `code_retired` or
   * `code_not_in_period`.
   */
  private async checkReason(tenantId: string, reason: Coding): Promise<Coding> {
    if (!reason || reason.system !== REASON_SYSTEM) {
      throw new InvalidRequestError(
        'invalid_exception_reason',
        `The reason must be a code of ${REASON_SYSTEM}.`,
      )
    }
    await this.concepts.assertActive(tenantId, reason)
    return { system: reason.system, code: reason.code }
  }

  /**
   * Checks the new time of a moved session, and that `movedTo` goes with `moved` only.
   *
   * @param schedule - The schedule.
   * @param input - The exception as sent.
   * @param today - Today in the polyclinic's zone.
   * @returns The new time, or `null` for a cancelled session.
   * @throws InvalidRequestError `moved_to_required`, `moved_to_not_allowed`, `invalid_date`,
   * `date_in_past`, `invalid_times` or `not_moved`.
   */
  private checkMovedTo(
    schedule: PracticeSchedule,
    input: CreateExceptionInput,
    today: string,
  ): MovedToInput | null {
    const moved = input.movedTo
    if (input.kind === 'cancelled') {
      if (moved !== undefined) {
        throw new InvalidRequestError(
          'moved_to_not_allowed',
          'A cancelled session has no new time.',
        )
      }
      return null
    }
    if (moved === undefined) {
      throw new InvalidRequestError(
        'moved_to_required',
        'A moved session needs its new date and times.',
      )
    }
    if (!isLocalDate(moved.date)) {
      throw new InvalidRequestError(
        'invalid_date',
        'The new date must be a real day written as YYYY-MM-DD.',
      )
    }
    if (moved.date < today) {
      throw this.inPast()
    }
    if (!areSessionTimes(moved.startTime, moved.endTime)) {
      throw new InvalidRequestError(
        'invalid_times',
        'The times must be HH:mm and the end must be after the start on the same day.',
      )
    }
    if (
      moved.date === input.date &&
      moved.startTime === schedule.start_time &&
      moved.endTime === schedule.end_time
    ) {
      throw new InvalidRequestError(
        'not_moved',
        'The new time is the time the session already has.',
      )
    }
    return moved
  }

  /**
   * Checks that a moved session is still allowed: the doctor is eligible on the new date and is
   * not in two places (HR plan 5.8 PS10).
   *
   * @param tenantId - Tenant of the caller.
   * @param schedule - The schedule.
   * @param date - The date of the session that moves.
   * @param moved - Where it goes.
   * @throws InvalidRequestError `employee_not_found`, `unit_not_found` or `not_eligible_*`.
   * @throws ConflictError `schedule_overlaps`.
   */
  private async checkMove(
    tenantId: string,
    schedule: PracticeSchedule,
    date: string,
    moved: MovedToInput,
  ): Promise<void> {
    const doctor = await this.employees.findOne(schedule.employee_id)
    if (!doctor || doctor.tenant_id !== tenantId || doctor.deleted_at) {
      throw new InvalidRequestError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    const unit = await this.units.findOne(schedule.unit_id)
    if (!unit || unit.tenant_id !== tenantId) {
      throw new InvalidRequestError('unit_not_found', 'The unit was not found.')
    }
    const result = await this.eligibility.general(
      tenantId,
      doctor,
      unit,
      moved.date,
    )
    if (!result.eligible) {
      throw new InvalidRequestError(
        `not_eligible_${result.failed}`,
        'The doctor is not clinically eligible to practise in this polyclinic on that date.',
      )
    }
    const others = await this.otherSessions(
      tenantId,
      schedule.employee_id,
      moved.date,
      { scheduleId: moved.date === date ? schedule.id : undefined, exceptionId: undefined },
    )
    if (
      others.some((other) =>
        sessionsOverlap(other, { start: moved.startTime, end: moved.endTime }),
      )
    ) {
      throw this.overlaps()
    }
  }

  /**
   * Lists the sessions a doctor has on a date: the regular sessions that no exception cancels or
   * moves away, and the sessions moved onto the date.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The doctor.
   * @param date - The date.
   * @param skip - A regular session to leave out (the one being moved) and an exception whose
   * moved session to leave out (the one being undone).
   * @returns The local start and end of each session.
   */
  private async otherSessions(
    tenantId: string,
    employeeId: string,
    date: string,
    skip: { scheduleId: string | undefined; exceptionId: string | undefined },
  ): Promise<{ start: string; end: string }[]> {
    const regular = (
      await this.schedules.findByEmployeeAndDay(tenantId, employeeId, isoWeekday(date))
    ).filter((schedule) => this.hasSession(schedule, date))
    const touching = await this.exceptions.findByEmployeeAndDate(
      tenantId,
      employeeId,
      date,
    )
    const removed = new Set(
      touching.filter((item) => item.date === date).map((item) => item.schedule_id),
    )
    const sessions: { start: string; end: string }[] = []
    for (const schedule of regular) {
      if (!removed.has(schedule.id) && schedule.id !== skip.scheduleId) {
        sessions.push({ start: schedule.start_time, end: schedule.end_time })
      }
    }
    for (const item of touching) {
      if (
        item.kind === 'moved' &&
        item.moved_to?.date === date &&
        item.id !== skip.exceptionId
      ) {
        sessions.push({ start: item.moved_to.start_time, end: item.moved_to.end_time })
      }
    }
    return sessions
  }

  /**
   * Loads a schedule of the caller's tenant, whatever its status: an ended schedule still has
   * sessions up to its last date.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Schedule identifier.
   * @returns The schedule.
   * @throws NotFoundError `schedule_not_found`.
   */
  private async loadSchedule(
    tenantId: string,
    id: string,
  ): Promise<PracticeSchedule> {
    const schedule = await this.schedules.findOne(id)
    if (!schedule || schedule.tenant_id !== tenantId || schedule.deleted_at) {
      throw new NotFoundError(
        'schedule_not_found',
        'The practice schedule was not found.',
      )
    }
    return schedule
  }

  /**
   * Reads today in the zone of the schedule's facility (UTC when it cannot be read).
   *
   * @param schedule - The schedule, if it still exists.
   * @returns Today's local date.
   */
  private async today(schedule: PracticeSchedule | null): Promise<string> {
    const facility = schedule
      ? await this.facilities.findOne(schedule.facility_id)
      : null
    return todayInZone(facility?.timezone ?? 'UTC')
  }

  /**
   * @returns The error for a date in the past.
   */
  private inPast(): InvalidRequestError {
    return new InvalidRequestError(
      'date_in_past',
      'An exception cannot be made or undone for a date in the past.',
    )
  }

  /**
   * @returns The conflict for two sessions of one doctor that overlap.
   */
  private overlaps(): ConflictError {
    return new ConflictError(
      'schedule_overlaps',
      'The doctor already has a session that overlaps this one.',
    )
  }

  /**
   * @returns The conflict for a stale version.
   */
  private stale(): ConflictError {
    return new ConflictError(
      'stale_version',
      'The record was changed by someone else. Read it again and retry.',
    )
  }
}
