import { type Repository } from '@utility/database/interface'
import { type Coding } from '@repository/model/common/coding'
import {
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@repository/model/leave-request'

/**
 * Filters and paging of the request list.
 *
 * @property employeeId - Only requests of this employee.
 * @property unitId - Only requests made from this unit.
 * @property status - Only requests in this status.
 * @property from - Only requests whose period reaches this date or later.
 * @property to - Only requests whose period starts on or before this date.
 * @property proofOverdueBefore - Only requests whose proof is due before this date and not received.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface LeaveRequestQuery {
  employeeId?: string
  unitId?: string
  status?: LeaveRequestStatus
  from?: string
  to?: string
  proofOverdueBefore?: string
  limit?: number
  offset?: number
}

/**
 * Who a decision is waiting for.
 *
 * @property unitIds - Units whose Head the caller is: first steps decided by a Head of these units.
 * @property hr - The caller is HR Manager: first steps that fall to HR Manager and second steps.
 */
export interface WaitingFor {
  unitIds: string[]
  hr: boolean
}

/**
 * Persistence of leave requests. Nothing is deleted (`HR-LEV-040`).
 */
export interface LeaveRequestRepository extends Repository<LeaveRequest> {
  /**
   * Finds requests, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The requests, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: LeaveRequestQuery,
  ): Promise<LeaveRequest[]>

  /**
   * Finds the requests of an employee that share at least one date with a range.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param start - First date of the range.
   * @param end - Last date of the range.
   * @param statuses - Only requests in these statuses.
   * @returns The requests, possibly none.
   */
  findOverlapping(
    tenantId: string,
    employeeId: string,
    start: string,
    end: string,
    statuses: LeaveRequestStatus[],
  ): Promise<LeaveRequest[]>

  /**
   * Finds the requests of an employee, leave type and entitlement period that wait for a decision
   * (`requested` and `head_approved`), whose days are reserved.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param leaveType - The leave type.
   * @param periodStart - First day of the entitlement period.
   * @returns The requests, possibly none.
   */
  findPendingByEmployeeTypeAndPeriod(
    tenantId: string,
    employeeId: string,
    leaveType: Coding,
    periodStart: string,
  ): Promise<LeaveRequest[]>

  /**
   * Finds the requests that wait for a decision of the given people, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param waiting - The units whose Head is asking and whether HR Manager is.
   * @param limit - Page size.
   * @param offset - Items to skip.
   * @returns The requests; none when the asker decides nothing.
   */
  findWaiting(
    tenantId: string,
    waiting: WaitingFor,
    limit: number,
    offset: number,
  ): Promise<LeaveRequest[]>
}
