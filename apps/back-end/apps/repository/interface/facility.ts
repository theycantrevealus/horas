import { type Repository } from '@utility/database/interface'
import { type Facility } from '@repository/model/facility'

/**
 * Facility data access. Inject it with `REPOSITORY_FACILITY`.
 */
export interface FacilityRepository extends Repository<Facility> {
  /**
   * Finds a facility by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Facility code, unique inside the tenant.
   * @returns The facility, or `null` when none matches.
   */
  findByCode(tenantId: string, code: string): Promise<Facility | null>

  /**
   * Finds the active facilities of an organization.
   *
   * @param tenantId - Tenant to search in.
   * @param organizationId - Organization that runs the facilities.
   * @returns The active facilities, possibly none.
   */
  findActiveByOrganization(
    tenantId: string,
    organizationId: string,
  ): Promise<Facility[]>
}
