import { type Repository } from '@utility/database/interface'
import { type Role } from '@repository/model/role'

/**
 * Role data access. Inject it with `REPOSITORY_ROLE`.
 */
export interface RoleRepository extends Repository<Role> {
  /**
   * Finds a role by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Role code, unique inside the tenant.
   * @returns The role, or `null` when none matches.
   */
  findByCode(tenantId: string, code: string): Promise<Role | null>
}
