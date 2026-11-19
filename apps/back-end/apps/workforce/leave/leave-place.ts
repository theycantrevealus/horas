import { Inject, Injectable } from '@nestjs/common'
import { todayInZone, todayUtc } from '@utility/validation/local-date'
import { type FacilityRepository } from '@repository/interface/facility'
import { type OrganizationUnitRepository } from '@repository/interface/organization-unit'
import { type PositionAssignmentRepository } from '@repository/interface/position-assignment'
import { type Facility } from '@repository/model/facility'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import {
  REPOSITORY_FACILITY,
  REPOSITORY_ORGANIZATION_UNIT,
  REPOSITORY_POSITION_ASSIGNMENT,
} from '@repository/token'

/**
 * Where an employee works, for the leave rules.
 *
 * @property unit - Unit of the open primary assignment, or `null` without one.
 * @property facility - The unit's facility, or `null`.
 * @property today - Today's local date in the facility's time zone; today in UTC without a
 * facility.
 */
export interface LeavePlace {
  unit: OrganizationUnit | null
  facility: Facility | null
  today: string
}

/**
 * Finds the unit, facility and local "today" of an employee (HR plan 8.2 LB11). The leave services
 * of 8.2 to 8.4 share it. Writes no log entry (a read).
 */
@Injectable()
export class LeavePlaceService {
  /**
   * @param assignments - Position assignment repository.
   * @param units - Organization unit repository.
   * @param facilities - Facility repository.
   */
  constructor(
    @Inject(REPOSITORY_POSITION_ASSIGNMENT)
    private readonly assignments: PositionAssignmentRepository,
    @Inject(REPOSITORY_ORGANIZATION_UNIT)
    private readonly units: OrganizationUnitRepository,
    @Inject(REPOSITORY_FACILITY)
    private readonly facilities: FacilityRepository,
  ) {}

  /**
   * Finds the place of an employee from the open primary assignment.
   *
   * @param tenantId - Tenant of the caller.
   * @param employeeId - The employee.
   * @returns The unit, the facility and today's date there.
   */
  async of(tenantId: string, employeeId: string): Promise<LeavePlace> {
    const open = await this.assignments.findOpenByEmployee(tenantId, employeeId)
    const primary = open.find((assignment) => assignment.is_primary)
    const found = primary ? await this.units.findOne(primary.unit_id) : null
    const unit =
      found && found.tenant_id === tenantId && !found.deleted_at ? found : null
    const facility = unit ? await this.facilities.findOne(unit.facility_id) : null
    return {
      unit,
      facility,
      today: facility ? todayInZone(facility.timezone) : todayUtc(),
    }
  }
}
