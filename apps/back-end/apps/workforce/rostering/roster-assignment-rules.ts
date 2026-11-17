import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type RosterRole } from '@repository/model/roster-assignment'
import { type ShiftDefinition } from '@repository/model/shift-definition'
import { compareLocalDates } from '@utility/validation/local-date'
import { zonedInstant } from '@utility/validation/local-date'
import { addDays } from '../credentialing/appointment-rules'

/**
 * The roles an assignment can have.
 */
export const ROSTER_ROLES: readonly RosterRole[] = [
  'staff',
  'team_leader',
  'supervisor',
  'dpjp_on_call',
]

/**
 * Tells whether a value is a roster role.
 *
 * @param value - Value to check.
 * @returns True for `staff`, `team_leader`, `supervisor` or `dpjp_on_call`.
 */
export function isRosterRole(value: unknown): value is RosterRole {
  return ROSTER_ROLES.includes(value as RosterRole)
}

/**
 * Tells whether a date lies inside a period, both ends included.
 *
 * @param date - A real local date.
 * @param period - The period.
 * @returns True when the date is in the period.
 */
export function isInPeriod(date: string, period: ClosedDatePeriod): boolean {
  return (
    compareLocalDates(date, period.start) >= 0 &&
    compareLocalDates(date, period.end) <= 0
  )
}

/**
 * Computes the UTC instants of a shift on a date in the facility's zone (HR plan 5.5 RA10). An
 * overnight shift, whose end time is earlier than its start time, ends the next day. A day off has
 * no instants.
 *
 * @param date - The local date the shift starts.
 * @param shift - The shift, with its local times.
 * @param timeZone - IANA time zone of the facility.
 * @returns The start and end instants, or `null` for both on a day off.
 * @throws RangeError when the time zone is not valid.
 */
export function shiftInstants(
  date: string,
  shift: Pick<ShiftDefinition, 'type' | 'start_time' | 'end_time'>,
  timeZone: string,
): { startsAt: Date | null; endsAt: Date | null } {
  if (shift.type === 'off' || shift.start_time === null || shift.end_time === null) {
    return { startsAt: null, endsAt: null }
  }
  const endDate = shift.end_time < shift.start_time ? addDays(date, 1) : date
  return {
    startsAt: zonedInstant(date, shift.start_time, timeZone),
    endsAt: zonedInstant(endDate, shift.end_time, timeZone),
  }
}
