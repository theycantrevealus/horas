import { type Repository } from '@utility/database/interface'
import { type Coding } from '@repository/model/common/coding'
import { type LeavePolicy } from '@repository/model/leave-policy'

/**
 * Filters and paging of the policy list.
 *
 * @property leaveTypeSystem - Only policies of this code system.
 * @property leaveTypeCode - Only policies of this leave type code.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface LeavePolicyQuery {
  leaveTypeSystem?: string
  leaveTypeCode?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of leave policies. Nothing is deleted. A version is identified by its leave type and
 * its `effective_from`, which never change.
 */
export interface LeavePolicyRepository extends Repository<LeavePolicy> {
  /**
   * Finds policy versions, ordered by leave type code and then `effective_from`, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The policy versions, possibly none.
   */
  findByFilter(tenantId: string, query?: LeavePolicyQuery): Promise<LeavePolicy[]>

  /**
   * Finds the version of a leave type in force on a date: the latest `effective_from` on or before
   * it.
   *
   * @param tenantId - Tenant to search in.
   * @param leaveType - The leave type.
   * @param date - Local date (`YYYY-MM-DD`).
   * @returns The version, or `null` when none applies yet.
   */
  findInForce(
    tenantId: string,
    leaveType: Coding,
    date: string,
  ): Promise<LeavePolicy | null>

  /**
   * Finds the version of a leave type that starts on a date.
   *
   * @param tenantId - Tenant to search in.
   * @param leaveType - The leave type.
   * @param effectiveFrom - Local date the version starts.
   * @returns The version, or `null`.
   */
  findByTypeAndDate(
    tenantId: string,
    leaveType: Coding,
    effectiveFrom: string,
  ): Promise<LeavePolicy | null>
}
