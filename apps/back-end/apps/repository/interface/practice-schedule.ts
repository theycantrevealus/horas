import { type Repository } from '@utility/database/interface'
import { type PracticeSchedule } from '@repository/model/practice-schedule'

/**
 * Filters and paging of the schedule list.
 *
 * @property unitId - Only schedules of this polyclinic.
 * @property employeeId - Only schedules of this doctor.
 * @property status - Only schedules in this status.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface PracticeScheduleQuery {
  unitId?: string
  employeeId?: string
  status?: PracticeSchedule['status']
  limit?: number
  offset?: number
}

/**
 * Filters and paging of the schedules that have a session on a date.
 *
 * @property unitId - Only schedules of this polyclinic.
 * @property employeeId - Only schedules of this doctor.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface PracticeScheduleOnDateQuery {
  unitId?: string
  employeeId?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of practice schedules. Nothing is deleted: an ended schedule stays for history.
 */
export interface PracticeScheduleRepository extends Repository<PracticeSchedule> {
  /**
   * Finds schedules, ordered by polyclinic, weekday and start time.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The schedules, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: PracticeScheduleQuery,
  ): Promise<PracticeSchedule[]>

  /**
   * Finds the schedules of a weekday whose period covers a date, whatever their status: an ended
   * schedule still serves the days up to its last date.
   *
   * @param tenantId - Tenant to search in.
   * @param dayOfWeek - ISO weekday of the date, 1 to 7.
   * @param date - The local date.
   * @param query - Optional filters and paging.
   * @returns The schedules, ordered by polyclinic, start time and doctor.
   */
  findOnDate(
    tenantId: string,
    dayOfWeek: number,
    date: string,
    query?: PracticeScheduleOnDateQuery,
  ): Promise<PracticeSchedule[]>

  /**
   * Finds every schedule of a doctor on a weekday, active or ended, in every polyclinic, to check
   * that two sessions never overlap.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param dayOfWeek - ISO weekday, 1 to 7.
   * @returns The schedules, possibly none.
   */
  findByEmployeeAndDay(
    tenantId: string,
    employeeId: string,
    dayOfWeek: number,
  ): Promise<PracticeSchedule[]>

  /**
   * Finds every schedule of a doctor whose validity overlaps a range, active or ended (an ended
   * schedule still serves its sessions up to its last date), in every polyclinic. It is what an
   * approved leave cancels the sessions of.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The doctor.
   * @param start - First date of the range.
   * @param end - Last date of the range.
   * @returns The schedules, possibly none.
   */
  findByEmployeeCovering(
    tenantId: string,
    employeeId: string,
    start: string,
    end: string,
  ): Promise<PracticeSchedule[]>
}
