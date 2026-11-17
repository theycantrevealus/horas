import { Inject, Injectable } from '@nestjs/common'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_PROFESSIONAL_LICENSE,
} from '@repository/token'
import { isLicenseValidOn } from '../credentialing/appointment-rules'

/**
 * The condition of general clinical eligibility that failed (HR spec 5.5, `HR-ELG-002`).
 *
 * - `employment`: the status is not `probation` or `active`.
 * - `str`: no valid registration of the employee's profession.
 * - `sip`: no valid practice permit at the unit's facility.
 * - `spk`: no active SPK that covers the unit.
 */
export type EligibilityFailure = 'employment' | 'str' | 'sip' | 'spk'

/**
 * The answer of the eligibility check.
 *
 * @property eligible - True when conditions 1 to 4 hold.
 * @property failed - The first condition that failed, when not eligible.
 */
export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; failed: EligibilityFailure }

/**
 * General clinical eligibility (HR spec 5.5, conditions 1 to 4): what rostering checks for a
 * clinical employee in a clinical unit (`HR-ROS-002`). It is derived from the current records on
 * every call and never cached (`HR-ELG-001`). The privilege condition (5) belongs to group 6.
 */
@Injectable()
export class EligibilityService {
  /**
   * @param licenses - Professional licence repository.
   * @param appointments - Clinical appointment (SPK) repository.
   */
  constructor(
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
  ) {}

  /**
   * Checks conditions 1 to 4 for an employee in a unit on a date. The employment status is the
   * current one: the model keeps no history of statuses, so a future date reads the present status.
   * Licences and SPKs are read on the date, so a licence that expires before it is not valid.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The employee.
   * @param unit - The unit of the shift.
   * @param date - The local date of the shift.
   * @returns Whether the employee is eligible, and the first condition that failed.
   */
  async general(
    tenantId: string,
    employee: Employee,
    unit: OrganizationUnit,
    date: string,
  ): Promise<EligibilityResult> {
    if (
      employee.employment_status !== 'probation' &&
      employee.employment_status !== 'active'
    ) {
      return { eligible: false, failed: 'employment' }
    }
    const profession = employee.profession
    const valid = (
      await this.licenses.findByEmployee(tenantId, employee.id)
    ).filter(
      (license) =>
        profession !== null &&
        license.profession.system === profession.system &&
        license.profession.code === profession.code &&
        isLicenseValidOn(license, date),
    )
    if (!valid.some((license) => license.eligibility_role === 'registration')) {
      return { eligible: false, failed: 'str' }
    }
    if (
      !valid.some(
        (license) =>
          license.eligibility_role === 'practice_permit' &&
          license.practice_location?.facility_id === unit.facility_id,
      )
    ) {
      return { eligible: false, failed: 'sip' }
    }
    const spks = await this.appointments.findByFilter(tenantId, {
      employeeId: employee.id,
      status: 'active',
      unitId: unit.id,
      limit: 20,
    })
    const covered = spks.some(
      (spk) =>
        spk.valid_period.start <= date &&
        spk.valid_period.end >= date &&
        spk.unit_ids.includes(unit.id),
    )
    return covered ? { eligible: true } : { eligible: false, failed: 'spk' }
  }
}
