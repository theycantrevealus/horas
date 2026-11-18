import { type Repository } from '@utility/database/interface'
import {
  type ShiftSwapRequest,
  type SwapStatus,
} from '@repository/model/shift-swap-request'

/**
 * Filters and paging of the swap request list.
 *
 * @property unitId - Only requests of this unit.
 * @property rosterId - Only requests of this roster.
 * @property status - Only requests in this status.
 * @property employeeId - Only requests where this employee is the requester or the counterpart.
 * @property limit - Page size.
 * @property offset - Items to skip.
 */
export interface SwapQuery {
  unitId?: string
  rosterId?: string
  status?: SwapStatus
  employeeId?: string
  limit?: number
  offset?: number
}

/**
 * Persistence of shift swap requests. Nothing is deleted.
 */
export interface ShiftSwapRequestRepository extends Repository<ShiftSwapRequest> {
  /**
   * Finds requests, latest first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The requests, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: SwapQuery,
  ): Promise<ShiftSwapRequest[]>

  /**
   * Finds the open requests (`requested` or `accepted_by_counterpart`) that name any of the
   * assignments, as the requester's or as the counterpart's.
   *
   * @param tenantId - Tenant to search in.
   * @param assignmentIds - The assignments.
   * @returns The open requests, possibly none.
   */
  findOpenByAssignments(
    tenantId: string,
    assignmentIds: string[],
  ): Promise<ShiftSwapRequest[]>
}
