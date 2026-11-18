import { type Repository } from '@utility/database/interface'
import { type PracticeScheduleException } from '@repository/model/practice-schedule-exception'

/**
 * Filters of the sessions moved onto a date.
 *
 * @property unitId - Only this polyclinic.
 * @property employeeId - Only this doctor.
 * @property limit - Most exceptions to return.
 */
export interface MovedToQuery {
  unitId?: string
  employeeId?: string
  limit?: number
}

/**
 * Persistence of practice schedule exceptions. An exception is never changed: undoing one
 * soft-deletes it, and the soft-deleted record no longer counts (HR plan 5.8 PS11).
 */
export interface PracticeScheduleExceptionRepository extends Repository<PracticeScheduleException> {
  /**
   * Finds the exception of a schedule on a date, if one is in force.
   *
   * @param tenantId - Tenant to search in.
   * @param scheduleId - The schedule.
   * @param date - The date of the session.
   * @returns The exception, or `null`.
   */
  findByScheduleAndDate(
    tenantId: string,
    scheduleId: string,
    date: string,
  ): Promise<PracticeScheduleException | null>

  /**
   * Finds the exceptions in force on a date for some schedules (the session of that date was
   * cancelled or moved).
   *
   * @param tenantId - Tenant to search in.
   * @param scheduleIds - The schedules.
   * @param date - The date of the sessions.
   * @returns The exceptions, possibly none.
   */
  findBySchedulesAndDate(
    tenantId: string,
    scheduleIds: string[],
    date: string,
  ): Promise<PracticeScheduleException[]>

  /**
   * Finds the sessions moved onto a date, ordered by polyclinic, start time and doctor.
   *
   * @param tenantId - Tenant to search in.
   * @param date - The new date.
   * @param query - Optional filters and a limit.
   * @returns The moved exceptions, possibly none.
   */
  findMovedTo(
    tenantId: string,
    date: string,
    query?: MovedToQuery,
  ): Promise<PracticeScheduleException[]>

  /**
   * Finds the exceptions of a doctor that touch a date: a session of that date was cancelled or
   * moved away, or a session was moved onto it.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param date - The date.
   * @returns The exceptions, possibly none.
   */
  findByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<PracticeScheduleException[]>
}
