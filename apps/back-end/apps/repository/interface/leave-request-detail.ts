import { type Repository } from '@utility/database/interface'
import { type LeaveRequestDetail } from '@repository/model/leave-request-detail'

/**
 * Persistence of the reason and proof of leave requests. Nothing is deleted.
 */
export interface LeaveRequestDetailRepository extends Repository<LeaveRequestDetail> {
  /**
   * Finds the detail of a request.
   *
   * @param tenantId - Tenant to search in.
   * @param requestId - The request.
   * @returns The detail, or `null` when there is none.
   */
  findByRequest(
    tenantId: string,
    requestId: string,
  ): Promise<LeaveRequestDetail | null>
}
