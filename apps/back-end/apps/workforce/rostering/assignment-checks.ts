import { type Employee } from '@repository/model/employee'
import { type OrganizationUnit } from '@repository/model/organization-unit'
import { type Roster } from '@repository/model/roster'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import { type EligibilityService } from '../eligibility/eligibility.service'
import { InvalidRequestError } from '../workforce.error'
import { isRosterRole } from './roster-assignment-rules'
import {
  checkWorkingTime,
  type WorkingShift,
  type WorkingTimeLimits,
  type WorkingTimeViolation,
} from './working-time'

/**
 * Fixed messages of the working-time rejections, keyed by the rule that was broken.
 */
export const WORKING_TIME_MESSAGES: Record<WorkingTimeViolation, string> = {
  overlap: 'The employee already works at that time, in this or another unit.',
  rest_too_short: 'The rest between two shifts of the employee is too short.',
  overtime_consent_required:
    'The shift adds overtime and needs the consent of the employee.',
  overtime_limit_exceeded: 'The shift would exceed the overtime limit of the week.',
  too_many_nights: 'The employee would work too many night shifts in a row.',
}

/**
 * The checks of an assignment that the single add (HR plan 5.5) and the roster import (HR plan
 * 5.6) share, so the two cannot drift apart. Each throws an `InvalidRequestError` with the code of
 * the rule that is broken.
 */

/**
 * Refuses a role that is not one of the four.
 *
 * @param role - The role as sent.
 * @throws InvalidRequestError `invalid_role`.
 */
export function assertRole(role: unknown): void {
  if (!isRosterRole(role)) {
    throw new InvalidRequestError(
      'invalid_role',
      'The role must be staff, team_leader, supervisor or dpjp_on_call.',
    )
  }
}

/**
 * Checks that a shift can be used in a roster (HR plan 5.5 RA7): active, of the roster's facility
 * and usable by the unit.
 *
 * @param shift - The shift definition, already known to belong to the tenant.
 * @param roster - The roster.
 * @param unit - The unit of the roster.
 * @throws InvalidRequestError `shift_retired`, `shift_outside_facility` or `shift_unit_not_allowed`.
 */
export function assertShiftUsable(
  shift: Pick<ShiftDefinition, 'status' | 'facility_id' | 'unit_ids'>,
  roster: Pick<Roster, 'facility_id'>,
  unit: Pick<OrganizationUnit, 'id'>,
): void {
  if (shift.status !== 'active') {
    throw new InvalidRequestError('shift_retired', 'The shift is retired.')
  }
  if (shift.facility_id !== roster.facility_id) {
    throw new InvalidRequestError(
      'shift_outside_facility',
      'The shift belongs to another facility than the roster.',
    )
  }
  if (shift.unit_ids.length > 0 && !shift.unit_ids.includes(unit.id)) {
    throw new InvalidRequestError(
      'shift_unit_not_allowed',
      'The unit may not use this shift.',
    )
  }
}

/**
 * Refuses an employee whose status is not `probation` or `active` (`HR-ROS-001`).
 *
 * @param employee - The employee.
 * @throws InvalidRequestError `employee_not_assignable`.
 */
export function assertAssignable(
  employee: Pick<Employee, 'employment_status'>,
): void {
  if (
    employee.employment_status !== 'probation' &&
    employee.employment_status !== 'active'
  ) {
    throw new InvalidRequestError(
      'employee_not_assignable',
      'Only an employee on probation or active can be assigned.',
    )
  }
}

/**
 * Checks general clinical eligibility for a clinical employee in a clinical unit (`HR-ROS-002`,
 * HR plan 5.5 RA11).
 *
 * @param eligibility - The eligibility service.
 * @param tenantId - Tenant of the caller.
 * @param employee - The employee.
 * @param unit - The unit of the roster.
 * @param date - The local date of the shift.
 * @throws InvalidRequestError `not_eligible_employment`, `not_eligible_str`, `not_eligible_sip` or
 * `not_eligible_spk`.
 */
export async function assertEligible(
  eligibility: EligibilityService,
  tenantId: string,
  employee: Employee,
  unit: OrganizationUnit,
  date: string,
): Promise<void> {
  if (!employee.is_clinical || !unit.is_clinical) {
    return
  }
  const result = await eligibility.general(tenantId, employee, unit, date)
  if (!result.eligible) {
    throw new InvalidRequestError(
      `not_eligible_${result.failed}`,
      'The employee is not clinically eligible to work in this unit on that date.',
    )
  }
}

/**
 * Turns a stored assignment into the shift the working-time rules see.
 *
 * @param assignment - The assignment.
 * @returns The shift.
 */
export function toWorkingShift(assignment: RosterAssignment): WorkingShift {
  return {
    date: assignment.date,
    startsAt: assignment.starts_at,
    endsAt: assignment.ends_at,
    paidMinutes: assignment.shift.paid_minutes,
    isNight: assignment.shift.is_night,
  }
}

/**
 * Checks a shift against the employee's other planned shifts and refuses it at the first rule it
 * breaks (`HR-ROS-010` to `013`, `015`, `016`).
 *
 * @param candidate - The shift being added or changed.
 * @param others - The employee's other planned shifts, in every roster and unit.
 * @param limits - The limits of the HR parameters.
 * @param consent - Whether the employee consents to overtime on this shift.
 * @returns The overtime minutes the shift adds.
 * @throws InvalidRequestError the first working-time rule that is broken.
 */
export function firstWorkingTimeViolation(
  candidate: WorkingShift,
  others: WorkingShift[],
  limits: WorkingTimeLimits,
  consent: boolean,
): number {
  const result = checkWorkingTime(candidate, others, limits, consent)
  const first = result.violations[0]
  if (first) {
    throw new InvalidRequestError(first, WORKING_TIME_MESSAGES[first])
  }
  return result.overtimeMinutes
}
