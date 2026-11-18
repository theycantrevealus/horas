import { Inject, Injectable } from '@nestjs/common'
import { type ClinicalAppointmentRepository } from '@repository/interface/clinical-appointment'
import { type PrivilegeGrantRepository } from '@repository/interface/privilege-grant'
import { type ProfessionalLicenseRepository } from '@repository/interface/professional-license'
import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type PrivilegeGrant } from '@repository/model/privilege-grant'
import {
  REPOSITORY_CLINICAL_APPOINTMENT,
  REPOSITORY_PRIVILEGE_GRANT,
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
 * Every condition of the full rule, in the order a failure is reported (`HR-ELG-002`).
 */
export type EligibilityCondition = EligibilityFailure | 'privilege'

/**
 * The outcome of one condition.
 *
 * @property condition - Which condition.
 * @property met - Whether it holds on the date.
 */
export interface EligibilityCheck {
  condition: EligibilityCondition
  met: boolean
}

/**
 * The full answer: every condition evaluated, the first failure, and the grant that satisfied the
 * privilege condition.
 *
 * @property eligible - True when every evaluated condition holds.
 * @property failed - The first failing condition, or `null`.
 * @property checks - The evaluated conditions in order; `privilege` only when one was asked for.
 * @property grant - The active grant that satisfies condition 5, or `null`.
 */
export interface EligibilityReport {
  eligible: boolean
  failed: EligibilityCondition | null
  checks: EligibilityCheck[]
  grant: PrivilegeGrant | null
}

/** Rank of a grant condition, so the most permissive grant is the one reported. */
const CONDITION_RANK = { full: 0, supervised: 1, restricted: 2 } as const

/**
 * Clinical eligibility (HR spec 5.5). `general` checks conditions 1 to 4, which rostering needs
 * (`HR-ROS-002`); `full` evaluates every condition, with the privilege (condition 5) when one is
 * asked for. Both read the current records on every call and never cache (`HR-ELG-001`).
 */
@Injectable()
export class EligibilityService {
  /**
   * @param licenses - Professional licence repository.
   * @param appointments - Clinical appointment (SPK) repository.
   * @param grants - Privilege grant repository.
   */
  constructor(
    @Inject(REPOSITORY_PROFESSIONAL_LICENSE)
    private readonly licenses: ProfessionalLicenseRepository,
    @Inject(REPOSITORY_CLINICAL_APPOINTMENT)
    private readonly appointments: ClinicalAppointmentRepository,
    @Inject(REPOSITORY_PRIVILEGE_GRANT)
    private readonly grants: PrivilegeGrantRepository,
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
    const report = await this.full(tenantId, employee, unit, date)
    return report.eligible
      ? { eligible: true }
      : { eligible: false, failed: report.failed as EligibilityFailure }
  }

  /**
   * Evaluates every condition without stopping at the first failure, so a caller sees all causes.
   *
   * @param tenantId - Tenant of the caller.
   * @param employee - The employee.
   * @param unit - The unit.
   * @param date - The local date.
   * @param catalogItemId - The privilege to check as condition 5, when one is asked for.
   * @returns The report.
   */
  async full(
    tenantId: string,
    employee: Employee,
    unit: OrganizationUnit,
    date: string,
    catalogItemId?: string,
  ): Promise<EligibilityReport> {
    const checks: EligibilityCheck[] = []
    checks.push({
      condition: 'employment',
      met:
        employee.employment_status === 'probation' ||
        employee.employment_status === 'active',
    })
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
    checks.push({
      condition: 'str',
      met: valid.some((license) => license.eligibility_role === 'registration'),
    })
    checks.push({
      condition: 'sip',
      met: valid.some(
        (license) =>
          license.eligibility_role === 'practice_permit' &&
          license.practice_location?.facility_id === unit.facility_id,
      ),
    })
    const spks = (
      await this.appointments.findByFilter(tenantId, {
        employeeId: employee.id,
        status: 'active',
        unitId: unit.id,
        limit: 20,
      })
    ).filter(
      (spk) =>
        spk.valid_period.start <= date &&
        spk.valid_period.end >= date &&
        spk.unit_ids.includes(unit.id),
    )
    checks.push({ condition: 'spk', met: spks.length > 0 })
    let grant: PrivilegeGrant | null = null
    if (catalogItemId !== undefined) {
      grant = await this.findGrant(tenantId, employee.id, unit.id, catalogItemId, spks.map((spk) => spk.id))
      checks.push({ condition: 'privilege', met: grant !== null })
    }
    const failed = checks.find((check) => !check.met)
    return {
      eligible: failed === undefined,
      failed: failed?.condition ?? null,
      checks,
      grant,
    }
  }

  /**
   * Finds the active grant that satisfies condition 5: an `active` grant of the privilege, in one
   * of the employee's valid SPKs, that covers the unit. The most permissive one is returned.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The practitioner.
   * @param unitId - The unit.
   * @param catalogItemId - The privilege.
   * @param spkIds - Ids of the SPKs that are active on the date and cover the unit.
   * @returns The grant, or `null`.
   */
  private async findGrant(
    tenantId: string,
    employeeId: string,
    unitId: string,
    catalogItemId: string,
    spkIds: string[],
  ): Promise<PrivilegeGrant | null> {
    if (spkIds.length === 0) {
      return null
    }
    const grants = await this.grants.findByFilter(tenantId, {
      employeeId,
      catalogItemId,
      status: 'active',
      unitId,
      limit: 50,
    })
    const usable = grants
      .filter((grant) => spkIds.includes(grant.appointment_id))
      .sort(
        (a, b) => CONDITION_RANK[a.condition] - CONDITION_RANK[b.condition],
      )
    return usable[0] ?? null
  }
}
