import { type Repository } from '@utility/database/interface'
import { type ClinicalAppointment } from '@repository/model/clinical-appointment'

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
}
