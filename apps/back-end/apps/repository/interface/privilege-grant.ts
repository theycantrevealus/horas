import { type Repository } from '@utility/database/interface'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'

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
}
