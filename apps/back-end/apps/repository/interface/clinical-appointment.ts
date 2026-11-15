import { type Repository } from '@utility/database/interface'
import {
  type ClinicalAppointment,
  type ClinicalAppointmentStatus,
} from '@repository/model/clinical-appointment'
import { type LocalDate } from '@repository/model/common/calendar'

/**
 * Filters and paging of the SPK list.
 *
 * @property status - Only appointments in this status.
 * @property current - Only appointments that are current (`active` or `suspended`).
 * @property employeeId - Only the practitioner's appointments.
 * @property facilityId - Only appointments that cover this facility.
 * @property unitId - Only appointments that cover this unit.
 * @property endOnOrBefore - Only appointments whose last valid day is on or before this date.
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface AppointmentQuery {
  status?: ClinicalAppointmentStatus
  current?: boolean
  employeeId?: string
  facilityId?: string
  unitId?: string
  endOnOrBefore?: LocalDate
  limit?: number
  offset?: number
}

/**
 * Paging of one practitioner's SPKs.
 *
 * @property limit - Page size; the repository default applies when omitted.
 * @property offset - Records to skip.
 */
export interface AppointmentPaging {
  limit?: number
  offset?: number
}

/**
 * Clinical appointment (SPK) data access. Inject it with `REPOSITORY_CLINICAL_APPOINTMENT`.
 * Appointments are never deleted (`HR-CRD-010`).
 */
export interface ClinicalAppointmentRepository extends Repository<ClinicalAppointment> {
  /**
   * Finds an appointment by its letter number.
   *
   * @param tenantId - Tenant to search in.
   * @param appointmentNumber - The SPK letter number.
   * @returns The appointment, or `null` when there is none.
   */
  findByNumber(
    tenantId: string,
    appointmentNumber: string,
  ): Promise<ClinicalAppointment | null>

  /**
   * Finds the current (`active` or `suspended`) regular, not temporary, appointment of an employee
   * at a credentialing facility.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The practitioner.
   * @param facilityId - The credentialing facility.
   * @returns The appointment, or `null` when there is none.
   */
  findCurrentRegular(
    tenantId: string,
    employeeId: string,
    facilityId: string,
  ): Promise<ClinicalAppointment | null>

  /**
   * Finds appointments, the soonest end of validity first.
   *
   * @param tenantId - Tenant to search in.
   * @param query - Optional filters and paging.
   * @returns The appointments, possibly none.
   */
  findByFilter(
    tenantId: string,
    query?: AppointmentQuery,
  ): Promise<ClinicalAppointment[]>

  /**
   * Finds one practitioner's appointments, the newest start of validity first.
   *
   * @param tenantId - Tenant to search in.
   * @param employeeId - The practitioner.
   * @param paging - Optional paging.
   * @returns The appointments, possibly none.
   */
  findByEmployee(
    tenantId: string,
    employeeId: string,
    paging?: AppointmentPaging,
  ): Promise<ClinicalAppointment[]>
}
