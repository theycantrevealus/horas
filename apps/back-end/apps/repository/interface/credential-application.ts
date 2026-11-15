import { type Repository } from '@utility/database/interface'
import {
  type CredentialApplication,
  type CredentialApplicationStatus,
} from '@repository/model/credential-application'

/**
 * Filters and paging of the committee work queue.
 *
 * @property status - Only applications in this status.
 * @property committee - Only applications of this committee code.
 * @property facilityId - Only applications credentialed by this facility.
 * @property employeeId - Only applications of this applicant.
 * @property statusBefore - Only applications whose current status began at or before this instant.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface ApplicationQuery {
  status?: CredentialApplicationStatus
  committee?: string
  facilityId?: string
  employeeId?: string
  statusBefore?: Date
  limit?: number
  offset?: number
}

/**
 * Credential application data access. Inject it with `REPOSITORY_CREDENTIAL_APPLICATION`.
 * Applications are never deleted (`HR-CRD-010`).
 */
export interface CredentialApplicationRepository extends Repository<CredentialApplication> {
  /**
   * Finds applications, the oldest status first (the committee work queue).
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The applications, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: ApplicationQuery,
  ): Promise<CredentialApplication[]>

  /**
   * Finds the open renewal application of an SPK: one with that `previous_appointment_id` that is
   * not yet `approved`, `rejected` or `withdrawn` (HR plan 4.4 RN2).
   *
   * @param tenantId - Tenant to search in.
   * @param previousAppointmentId - The SPK being renewed or extended.
   * @returns The open application, or `null` when there is none.
   */
  findOpenRenewal(
    tenantId: string,
    previousAppointmentId: string,
  ): Promise<CredentialApplication | null>
}
