import { type Repository } from '@utility/database/interface'
import {
  type AssignmentStatus,
  type PositionAssignment,
} from '@repository/model/position-assignment'

/**
 * Filters and paging of a unit's assignment list.
 *
 * @property status - Only assignments in this status.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface UnitAssignmentQuery {
  status?: AssignmentStatus
  limit?: number
  offset?: number
}

/**
 * Position assignment data access. Inject it with `REPOSITORY_POSITION_ASSIGNMENT`. Assignments
 * are never deleted: the history stays complete.
 */
export interface PositionAssignmentRepository extends Repository<PositionAssignment> {
  /**
   * Finds every assignment of an employee, whatever its status, newest start first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The assignments, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]>

  /**
   * Finds the open (`planned` or `active`) assignments of an employee.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The open assignments, possibly none.
   */
  findOpenByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<PositionAssignment[]>

  /**
   * Finds the open assignments of a position.
   *
   * @param tenantId - Tenant to search in.
   * @param positionId - The position.
   * @returns The open assignments, possibly none.
   */
  findOpenByPosition(
    tenantId: string,
    positionId: string,
  ): Promise<PositionAssignment[]>

  /**
   * Finds the assignments whose position belongs to a unit (not the units below it), ordered by
   * start date and then identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @param query - Optional status filter and paging.
   * @returns The assignments, possibly none.
   */
  findByUnit(
    tenantId: string,
    unitId: string,
    query?: UnitAssignmentQuery,
  ): Promise<PositionAssignment[]>

  /**
   * Tells whether a unit has at least one open assignment.
   *
   * @param tenantId - Tenant to search in.
   * @param unitId - The unit.
   * @returns True when an open assignment exists.
   */
  findAnyOpenInUnit(tenantId: string, unitId: string): Promise<boolean>
}
