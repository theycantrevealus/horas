import { type Repository } from '@utility/database/interface'
import { type Organization } from '@repository/model/organization'

/**
 * Organization data access. Inject it with `REPOSITORY_ORGANIZATION`.
 */
export interface OrganizationRepository extends Repository<Organization> {
  /**
   * Finds an organization by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Organization code, unique inside the tenant.
   * @returns The organization, or `null` when none matches.
   */
  findByCode(tenantId: string, code: string): Promise<Organization | null>
}
