import { type Repository } from '@utility/database/interface'
import { type SeparationDetail } from '@repository/model/separation-detail'

/**
 * Persistence of the reasons of separations (`separation_details`).
 */
export interface SeparationDetailRepository extends Repository<SeparationDetail> {
  /**
   * Finds the detail of a separation.
   *
   * @param tenantId - Tenant to search in.
   * @param separationId - The separation.
   * @returns The detail, or `null`; also `null` for a malformed identifier.
   */
  findBySeparation(
    tenantId: string,
    separationId: string,
  ): Promise<SeparationDetail | null>
}
