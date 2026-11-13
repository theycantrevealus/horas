import { type Repository } from '@utility/database/interface'
import { type CommitteeMembership } from '@repository/model/committee-membership'

/**
 * Filters and paging of a facility's membership list.
 *
 * @property committee - Only memberships of this committee code.
 * @property role - Only memberships with this role code.
 * @property status - Only memberships in this status.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface FacilityMembershipQuery {
  committee?: string
  role?: string
  status?: CommitteeMembership['status']
  limit?: number
  offset?: number
}

/**
 * Committee membership data access. Inject it with `REPOSITORY_COMMITTEE_MEMBERSHIP`.
 * Memberships are never deleted: the history stays complete.
 */
export interface CommitteeMembershipRepository extends Repository<CommitteeMembership> {
  /**
   * Finds the memberships of a facility's committees, ordered by committee code, start date and
   * then identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param query - Optional filters and paging.
   * @returns The memberships, possibly none.
   */
  findByFacility(
    tenantId: string,
    facilityId: string,
    query?: FacilityMembershipQuery,
  ): Promise<CommitteeMembership[]>

  /**
   * Finds the active membership of an employee in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @returns The active membership, or `null` when there is none.
   */
  findActiveForEmployee(
    tenantId: string,
    employeeId: string,
    facilityId: string,
    committeeCode: string,
  ): Promise<CommitteeMembership | null>

  /**
   * Finds the active membership with a given role in one committee of a facility.
   *
   * @param tenantId - Tenant to search in.
   * @param facilityId - The facility.
   * @param committeeCode - Committee code.
   * @param roleCode - Role code.
   * @returns The first active membership with that role, or `null` when there is none.
   */
  findActiveByRole(
    tenantId: string,
    facilityId: string,
    committeeCode: string,
    roleCode: string,
  ): Promise<CommitteeMembership | null>
}
