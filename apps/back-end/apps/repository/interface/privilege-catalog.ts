import { type Repository } from '@utility/database/interface'
import { type PrivilegeCatalogItem } from '@repository/model/privilege-catalog-item'

/**
 * Filters and paging of the privilege catalog list.
 *
 * @property committee - Only items of this committee code.
 * @property profession - Only items whose professions include this code.
 * @property status - Only items in this status.
 * @property facilityId - Only items this facility may grant: those open to every facility and
 * those naming it.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface PrivilegeQuery {
  committee?: string
  profession?: string
  status?: PrivilegeCatalogItem['status']
  facilityId?: string
  limit?: number
  offset?: number
}

/**
 * Privilege catalog data access. Inject it with `REPOSITORY_PRIVILEGE_CATALOG`. Items are never
 * deleted: a privilege that is no longer offered is retired.
 */
export interface PrivilegeCatalogRepository extends Repository<PrivilegeCatalogItem> {
  /**
   * Finds an item by its code.
   *
   * @param tenantId - Tenant to search in.
   * @param code - Catalog code, upper case.
   * @returns The item, or `null` when none matches.
   */
  findByCode(
    tenantId: string,
    code: string,
  ): Promise<PrivilegeCatalogItem | null>

  /**
   * Finds catalog items ordered by code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The items, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: PrivilegeQuery,
  ): Promise<PrivilegeCatalogItem[]>
}
