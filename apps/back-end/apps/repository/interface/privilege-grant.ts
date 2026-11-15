import { type Repository } from '@utility/database/interface'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'

/**
 * Filters and paging of the privilege directory.
 *
 * @property catalogItemId - Only grants of this privilege.
 * @property employeeId - Only grants held by this practitioner.
 * @property appointmentId - Only grants of this SPK.
 * @property status - Only grants in this status.
 * @property condition - Only grants with this condition.
 * @property facilityId - Only grants that cover this facility.
 * @property unitId - Only grants that cover this unit.
 * @property flagged - `true`: only grants with an open flag; `false`: only grants without one.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface GrantQuery {
  catalogItemId?: string
  employeeId?: string
  appointmentId?: string
  status?: PrivilegeGrant['status']
  condition?: PrivilegeCondition
  facilityId?: string
  unitId?: string
  flagged?: boolean
  limit?: number
  offset?: number
}

/**
 * Privilege grant data access. Inject it with `REPOSITORY_PRIVILEGE_GRANT`. Grants are never
 * deleted (`HR-CRD-010`).
 */
export interface PrivilegeGrantRepository extends Repository<PrivilegeGrant> {
  /**
   * Finds the grants of an appointment, ordered by privilege code.
   *
   * @param tenantId - Tenant to search in.
   * @param appointmentId - The SPK.
   * @returns The grants, possibly none.
   */
  findByAppointment(
    tenantId: string,
    appointmentId: string,
  ): Promise<PrivilegeGrant[]>

  /**
   * Finds an `active`, `full` grant of a privilege held by an employee in a facility, for the
   * supervisor check of `HR-CRD-006`. The caller still checks that its SPK is active.
   *
   * @param tenantId - Tenant to search in.
   * @param catalogItemId - The privilege.
   * @param employeeId - The would-be supervisor.
   * @param facilityId - A facility the grant must cover.
   * @returns The grant, or `null` when there is none.
   */
  findActiveFullGrant(
    tenantId: string,
    catalogItemId: string,
    employeeId: string,
    facilityId: string,
  ): Promise<PrivilegeGrant | null>

  /**
   * Finds grants for the privilege directory, ordered by privilege code.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The grants, possibly none.
   */
  findByFilter(tenantId: string, query?: GrantQuery): Promise<PrivilegeGrant[]>
}
