import { type Repository } from '@utility/database/interface'
import { type RosterAssignment } from '@repository/model/roster-assignment'

/**
 * Filters and paging of the assignment list of a roster.
 *
 * @property date - Only assignments on this date.
 * @property from - Only assignments on or after this date.
 * @property to - Only assignments on or before this date.
 * @property employeeId - Only assignments of this employee.
 * @property status - Only assignments in this status.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface AssignmentQuery {
  date?: string
  from?: string
  to?: string
  employeeId?: string
  status?: RosterAssignment['status']
  limit?: number
  offset?: number
}

/**
 * Persistence of roster assignments. Nothing is deleted: a cancelled assignment keeps its record.
 */
export interface RosterAssignmentRepository extends Repository<RosterAssignment> {
  /**
   * Finds the assignments of a roster, ordered by date, then by employee.
   *
   * @param tenantId - Tenant to search in.
   * @param rosterId - The roster.
   * @param query - Optional filters and paging.
   * @returns The assignments, possibly none.
   */
  findByRoster(
    tenantId: string,
    rosterId: string,
    query?: AssignmentQuery,
  ): Promise<RosterAssignment[]>

  /**
   * Finds the planned assignments of an employee on dates in a range, in every roster and unit
   * (`HR-ROS-016`).
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param from - First date of the range.
   * @param to - Last date of the range.
   * @returns The planned assignments, possibly none.
   */
  findPlannedByEmployeeBetween(
    tenantId: string,
    employeeId: string,
    from: string,
    to: string,
  ): Promise<RosterAssignment[]>

  /**
   * Finds the planned assignment of an employee on a date in a roster.
   *
   * @param tenantId - Tenant to search in.
   * @param rosterId - The roster.
   * @param employeeId - The employee.
   * @param date - The date.
   * @returns The assignment, or `null` when there is none.
   */
  findPlannedByEmployeeAndDate(
    tenantId: string,
    rosterId: string,
    employeeId: string,
    date: string,
  ): Promise<RosterAssignment | null>

  /**
   * Finds the planned assignments of a unit that are on duty at an instant: they started at or
   * before it, end after it, and carry no unresolved flag (`HR-ROS-031`).
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param at - The instant.
   * @returns The assignments on duty, possibly none.
   */
  findOnDuty(
    tenantId: string,
    unitId: string,
    at: Date,
  ): Promise<RosterAssignment[]>

  /**
   * Finds planned assignments of a shift in some rosters, to tell whether the shift is in use.
   *
   * @param tenantId - Tenant to search in.
   * @param shiftId - The shift definition.
   * @param rosterIds - The rosters to look in.
   * @param limit - Most assignments to return.
   * @returns The planned assignments of the shift, possibly none.
   */
  findPlannedByShiftInRosters(
    tenantId: string,
    shiftId: string,
    rosterIds: string[],
    limit: number,
  ): Promise<RosterAssignment[]>
}
