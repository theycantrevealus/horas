import { Inject, Injectable } from '@nestjs/common'
import { todayInZone } from '@utility/validation/local-date'
import { type EmployeeRepository } from '@repository/interface/employee'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PrivilegeCatalogRepository } from '@repository/interface/privilege-catalog'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import {
  REPOSITORY_EMPLOYEE,
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_PRIVILEGE_CATALOG,
} from '@repository/token'
import { InvalidRequestError, NotFoundError } from '../workforce.error'
import {
  type EligibilityCheck,
  type EligibilityCondition,
  EligibilityService,
} from './eligibility.service'

/**
 * The privilege that satisfied condition 5.
 *
 * @property catalogItemId - The privilege.
 * @property code - Catalog code at the time of the grant.
 * @property condition - How it may be performed.
 * @property supervisorEmployeeId - The supervisor of a supervised grant, otherwise `null`.
 * @property flagged - True while the grant has an open warning (`HR-CRD-006`).
 */
export interface EligiblePrivilege {
  catalogItemId: string
  code: string
  condition: PrivilegeCondition
  supervisorEmployeeId: string | null
  flagged: boolean
}

/**
 * The answer of the eligibility read (HR plan 6 CE3).
 *
 * @property employeeId - The practitioner.
 * @property unitId - The unit.
 * @property date - The local date the records were read on.
 * @property employmentAsOf - Always `current`: the employment status has no history (CE7).
 * @property eligible - True when every evaluated condition holds.
 * @property failed - The first failing condition, or `null`.
 * @property checks - Every condition evaluated, in order.
 * @property privilege - The grant that satisfied condition 5; `null` when no privilege was asked
 * for or none satisfied it.
 */
export interface EligibilityAnswer {
  employeeId: string
  unitId: string
  date: string
  employmentAsOf: 'current'
  eligible: boolean
  failed: EligibilityCondition | null
  checks: EligibilityCheck[]
  privilege: EligiblePrivilege | null
}

/**
 * Input of the eligibility read.
 *
 * @property employeeId - The practitioner.
 * @property unitId - The unit.
 * @property date - Local date; today in the facility's zone when omitted.
 * @property privilegeId - Catalog item to check as condition 5.
 */
export interface EligibilityQuery {
  employeeId: string
  unitId: string
  date?: string
  privilegeId?: string
}

/**
 * Answers "is this practitioner clinically eligible in this unit on this date, optionally for one
 * privilege?" (HR plan 6). A read: writes no log entry and stores nothing (`HR-ELG-001`).
 */
@Injectable()
export class EligibilityQueryService {
  /**
   * @param employees - Employee repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository, for the time zone.
   * @param catalog - Privilege catalog repository.
   * @param eligibility - The eligibility rule.
   */
  constructor(
    @Inject(REPOSITORY_EMPLOYEE) private readonly employees: EmployeeRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY) private readonly facilities: FacilityRepository,
    @Inject(REPOSITORY_PRIVILEGE_CATALOG)
    private readonly catalog: PrivilegeCatalogRepository,
    @Inject(EligibilityService)
    private readonly eligibility: EligibilityService,
  ) {}

  /**
   * Evaluates the eligibility of an employee in a unit on a date.
   *
   * @param tenantId - Tenant of the caller.
   * @param query - The employee, unit, optional date and optional privilege.
   * @returns The answer, with every condition checked.
   * @throws NotFoundError `employee_not_found`.
   * @throws InvalidRequestError `not_clinical_employee`, `unit_not_found` or `privilege_not_found`.
   */
  async check(
    tenantId: string,
    query: EligibilityQuery,
  ): Promise<EligibilityAnswer> {
    const employee = await this.employees.findOne(query.employeeId)
    if (!employee || employee.tenant_id !== tenantId || employee.deleted_at) {
      throw new NotFoundError(
        'employee_not_found',
        'The employee was not found.',
      )
    }
    if (!employee.is_clinical) {
      throw new InvalidRequestError(
        'not_clinical_employee',
        'Clinical eligibility applies to clinical employees only.',
      )
    }
    const unit = await this.units.findOne(query.unitId)
    if (!unit || unit.tenant_id !== tenantId || unit.deleted_at) {
      throw new InvalidRequestError('unit_not_found', 'The unit was not found.')
    }
    if (query.privilegeId !== undefined) {
      const item = await this.catalog.findOne(query.privilegeId)
      if (!item || item.tenant_id !== tenantId || item.deleted_at) {
        throw new InvalidRequestError(
          'privilege_not_found',
          'The privilege was not found.',
        )
      }
    }
    const facility = await this.facilities.findOne(unit.facility_id)
    const date = query.date ?? todayInZone(facility?.timezone ?? 'UTC')
    const report = await this.eligibility.full(
      tenantId,
      employee,
      unit,
      date,
      query.privilegeId,
    )
    const grant = report.grant
    return {
      employeeId: employee.id,
      unitId: unit.id,
      date,
      employmentAsOf: 'current',
      eligible: report.eligible,
      failed: report.failed,
      checks: report.checks,
      privilege:
        grant === null
          ? null
          : {
              catalogItemId: grant.catalog_item_id,
              code: grant.code,
              condition: grant.condition,
              supervisorEmployeeId: grant.supervisor?.employee_id ?? null,
              flagged: grant.flag !== null && grant.flag.resolved_at === null,
            },
    }
  }
}
