import { type Page, type Repository } from '@utility/database/interface'
import {
  type HrParameter,
  type HrParameterScope,
} from '@repository/model/hr-parameter'

/**
 * Filters of the parameter list.
 *
 * @property key - Only values of this parameter.
 * @property scopeKind - Only values set at this level.
 * @property scopeId - Only values set for this organization, facility or unit.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface HrParameterPageOptions {
  key?: string
  scopeKind?: HrParameterScope['kind']
  scopeId?: string
  limit?: number
  offset?: number
}

/**
 * HR parameter data access. Inject it with `REPOSITORY_HR_PARAMETER`. Values are append-only:
 * `update`, `delete` and `deleteSoft` are not supported.
 */
export interface HrParameterRepository extends Repository<HrParameter> {
  /**
   * Finds every value that was set for a parameter, at any scope and date, so the lookup can pick
   * the one in force. A parameter has few values, so the result is not paged.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @returns The values, possibly none.
   */
  findByKey(tenantId: string, key: string): Promise<HrParameter[]>

  /**
   * Finds the value set for a key, scope and date.
   *
   * @param tenantId - Tenant to search in.
   * @param key - Parameter key.
   * @param scope - Level and identifier the value applies to.
   * @param effectiveFrom - First day the value applies.
   * @returns The value, or `null` when none matches.
   */
  findOneAt(
    tenantId: string,
    key: string,
    scope: HrParameterScope,
    effectiveFrom: string,
  ): Promise<HrParameter | null>

  /**
   * Returns one page of values, ordered by key; with a key filter, newest date first.
   *
   * @param tenantId - Tenant to search in.
   * @param options - Filters and paging.
   * @returns The page.
   */
  findPage(
    tenantId: string,
    options: HrParameterPageOptions,
  ): Promise<Page<HrParameter>>
}
