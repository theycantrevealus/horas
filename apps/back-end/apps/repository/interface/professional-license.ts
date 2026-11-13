import { type Repository } from '@utility/database/interface'
import {
  type LicenseStatus,
  type ProfessionalLicense,
} from '@repository/model/professional-license'

/**
 * Filters and paging of the licence list.
 *
 * @property status - Only licences in this status.
 * @property licenseType - Only licences of this type code.
 * @property facilityId - Only licences whose practice location is this facility.
 * @property expiresFrom - Only licences whose expiry date is on or after this local date.
 * @property expiresTo - Only licences whose expiry date is on or before this local date.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface LicenseQuery {
  status?: LicenseStatus
  licenseType?: string
  facilityId?: string
  expiresFrom?: string
  expiresTo?: string
  limit?: number
  offset?: number
}

/**
 * Professional license data access. Inject it with `REPOSITORY_PROFESSIONAL_LICENSE`. Licences
 * are never deleted (`HR-LIC-008`): a correction rejects the record and registers a new one.
 */
export interface ProfessionalLicenseRepository extends Repository<ProfessionalLicense> {
  /**
   * Finds every licence of an employee, newest issue date first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The employee.
   * @returns The licences, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
  ): Promise<ProfessionalLicense[]>

  /**
   * Finds licences of the tenant. Ordered by expiry date and then identifier when an expiry
   * range is given, otherwise by identifier.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The licences, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: LicenseQuery,
  ): Promise<ProfessionalLicense[]>

  /**
   * Finds the live (not rejected) licence with a document number and type.
   *
   * @param tenantId - Tenant to search in.
   * @param typeSystem - Licence type system.
   * @param typeCode - Licence type code.
   * @param normalizedNumber - Document number without spaces, dots and hyphens, upper case.
   * @returns The licence, or `null` when none matches.
   */
  findLiveByNumber(
    tenantId: string,
    typeSystem: string,
    typeCode: string,
    normalizedNumber: string,
  ): Promise<ProfessionalLicense | null>
}
