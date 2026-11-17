import { type Coding } from '@repository/model/common/coding'
import {
  type CoverageMatch,
  type CoverageRequirement,
} from '@repository/model/coverage-requirement'
import { type Employee } from '@repository/model/employee'
import { type RosterAssignment } from '@repository/model/roster-assignment'
import { compareLocalDates } from '@utility/validation/local-date'
import { addDays } from '../credentialing/appointment-rules'

/**
 * Why a requirement is not met.
 *
 * - `min_count`: fewer matching employees than `min_count` (`HR-ROS-020`).
 * - `team_leader`: not exactly one team leader, or the leader does not meet the profession and the
 *   level of the requirement (`HR-ROS-022`).
 */
export type CoverageGapReason = 'min_count' | 'team_leader'

/**
 * A shift of a day that does not meet a requirement.
 *
 * @property date - The day.
 * @property shiftId - The shift definition.
 * @property requirementId - The requirement that is not met.
 * @property reason - Why.
 * @property required - What the requirement asks for.
 * @property actual - What the roster has.
 */
export interface CoverageGap {
  date: string
  shiftId: string
  requirementId: string
  reason: CoverageGapReason
  required: number
  actual: number
}

/**
 * Reads the numeric rank of a clinical level, or `null` when the concept has none.
 */
export type RankLookup = (coding: Coding) => number | null

/**
 * Tells whether a local date is a Saturday or a Sunday. Weekends are the same for every facility
 * until a parameter says otherwise (HR plan 5.5 RA18).
 *
 * @param date - A real local date.
 * @returns True on Saturday and Sunday.
 */
export function isWeekend(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const value = new Date(Date.UTC(2000, month - 1, day))
  value.setUTCFullYear(year)
  const weekday = value.getUTCDay()
  return weekday === 0 || weekday === 6
}

/**
 * Tells whether a requirement applies on a day: the day is in its period and matches its pattern
 * (`weekdays` is Monday to Friday, `weekends_holidays` is Saturday, Sunday and the holidays).
 *
 * @param requirement - The requirement.
 * @param date - The day.
 * @param holidays - The dates of the holidays of the facility's calendars.
 * @returns True when the requirement is checked on that day.
 */
export function requirementApplies(
  requirement: Pick<CoverageRequirement, 'period' | 'day_pattern'>,
  date: string,
  holidays: ReadonlySet<string>,
): boolean {
  if (
    compareLocalDates(date, requirement.period.start) < 0 ||
    (requirement.period.end !== null &&
      compareLocalDates(date, requirement.period.end) > 0)
  ) {
    return false
  }
  switch (requirement.day_pattern) {
    case 'all':
      return true
    case 'weekdays':
      return !isWeekend(date)
    case 'weekends_holidays':
      return isWeekend(date) || holidays.has(date)
  }
}

/**
 * Tells whether two codings are the same.
 *
 * @param left - One coding.
 * @param right - Another coding.
 * @returns True for the same system and code.
 */
function sameCoding(left: Coding, right: Coding): boolean {
  return left.system === right.system && left.code === right.code
}

/**
 * Tells whether an employee meets the criteria of a requirement. An unset criterion matches anyone;
 * the level means "this level or higher", compared by rank (HR plan 5.3 CR4).
 *
 * @param employee - The employee.
 * @param match - The criteria.
 * @param rank - Reads the rank of a clinical level.
 * @returns True when every set criterion is met.
 */
export function employeeMatches(
  employee: Pick<
    Employee,
    'workforce_category' | 'profession' | 'specialties' | 'clinical_level'
  >,
  match: CoverageMatch,
  rank: RankLookup,
): boolean {
  if (
    match.workforce_category &&
    !sameCoding(employee.workforce_category, match.workforce_category)
  ) {
    return false
  }
  if (
    match.profession &&
    (!employee.profession || !sameCoding(employee.profession, match.profession))
  ) {
    return false
  }
  if (
    match.specialty &&
    !employee.specialties.some((item) => sameCoding(item.coding, match.specialty as Coding))
  ) {
    return false
  }
  if (match.min_clinical_level) {
    if (!employee.clinical_level) {
      return false
    }
    const have = rank(employee.clinical_level)
    const need = rank(match.min_clinical_level)
    if (have === null || need === null) {
      return sameCoding(employee.clinical_level, match.min_clinical_level)
    }
    return have >= need
  }
  return true
}

/**
 * Finds the coverage gaps of a roster (`HR-ROS-020`, `022`).
 *
 * @param input - The days, the requirements, the planned assignments, the employees and the
 * holidays.
 * @param input.dates - Every day of the roster's period.
 * @param input.requirements - The active requirements of the unit.
 * @param input.assignments - The planned assignments of the roster.
 * @param input.employees - The employees of those assignments, by identifier.
 * @param input.holidays - The dates of the holidays of the facility's calendars.
 * @param input.rank - Reads the rank of a clinical level.
 * @returns The gaps, in date order.
 */
export function findCoverageGaps(input: {
  dates: string[]
  requirements: CoverageRequirement[]
  assignments: RosterAssignment[]
  employees: ReadonlyMap<string, Employee>
  holidays: ReadonlySet<string>
  rank: RankLookup
}): CoverageGap[] {
  const gaps: CoverageGap[] = []
  for (const date of input.dates) {
    for (const requirement of input.requirements) {
      if (!requirementApplies(requirement, date, input.holidays)) {
        continue
      }
      const onShift = input.assignments.filter(
        (assignment) =>
          assignment.date === date &&
          assignment.shift.definition_id === requirement.shift_definition_id,
      )
      const counted = onShift.filter((assignment) => {
        const employee = input.employees.get(assignment.employee_id)
        return (
          employee !== undefined &&
          employeeMatches(employee, requirement.match, input.rank)
        )
      })
      if (counted.length < requirement.min_count) {
        gaps.push({
          date,
          shiftId: requirement.shift_definition_id,
          requirementId: requirement.id,
          reason: 'min_count',
          required: requirement.min_count,
          actual: counted.length,
        })
      }
      if (requirement.team_leader_required) {
        const leaders = onShift.filter(
          (assignment) => assignment.role === 'team_leader',
        )
        const leader = leaders[0] ? input.employees.get(leaders[0].employee_id) : undefined
        const qualified =
          leaders.length === 1 &&
          leader !== undefined &&
          employeeMatches(
            leader,
            {
              workforce_category: null,
              profession: requirement.match.profession,
              specialty: null,
              min_clinical_level: requirement.match.min_clinical_level,
            },
            input.rank,
          )
        if (!qualified) {
          gaps.push({
            date,
            shiftId: requirement.shift_definition_id,
            requirementId: requirement.id,
            reason: 'team_leader',
            required: 1,
            actual: leaders.length,
          })
        }
      }
    }
  }
  return gaps
}

/**
 * Lists every day of a period.
 *
 * @param period - First and last day.
 * @param period.start - First day.
 * @param period.end - Last day.
 * @returns The days, in order.
 */
export function daysOf(period: { start: string; end: string }): string[] {
  const days: string[] = []
  for (let day = period.start; compareLocalDates(day, period.end) <= 0; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}
