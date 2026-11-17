import { addDays } from '../credentialing/appointment-rules'

/**
 * One shift of an employee as the working-time rules see it.
 *
 * @property date - Local date the shift starts.
 * @property startsAt - UTC instant it starts, or `null` for a day off.
 * @property endsAt - UTC instant it ends, or `null` for a day off.
 * @property paidMinutes - Working time counted (HR plan 5.5 RA13).
 * @property isNight - Counts toward the consecutive-night limit.
 */
export interface WorkingShift {
  date: string
  startsAt: Date | null
  endsAt: Date | null
  paidMinutes: number
  isNight: boolean
}

/**
 * The limits of the working-time rules, read from the HR parameters.
 *
 * @property minRestHours - `MIN_REST_HOURS`.
 * @property maxWeeklyHours - `MAX_WEEKLY_HOURS`.
 * @property maxOvertimeHoursWeek - `MAX_OVERTIME_HOURS_WEEK`.
 * @property maxConsecutiveNights - `MAX_CONSECUTIVE_NIGHTS`.
 */
export interface WorkingTimeLimits {
  minRestHours: number
  maxWeeklyHours: number
  maxOvertimeHoursWeek: number
  maxConsecutiveNights: number
}

/**
 * Why a shift breaks the working-time rules.
 *
 * - `overlap`: `HR-ROS-010`.
 * - `rest_too_short`: `HR-ROS-011`.
 * - `overtime_consent_required`, `overtime_limit_exceeded`: `HR-ROS-012` and `013`.
 * - `too_many_nights`: `HR-ROS-015`.
 */
export type WorkingTimeViolation =
  | 'overlap'
  | 'rest_too_short'
  | 'overtime_consent_required'
  | 'overtime_limit_exceeded'
  | 'too_many_nights'

/**
 * Result of checking a shift against the others of the same employee.
 *
 * @property violations - The rules the shift breaks, without repeats.
 * @property overtimeMinutes - Overtime this shift adds to its week, in minutes.
 */
export interface WorkingTimeResult {
  violations: WorkingTimeViolation[]
  overtimeMinutes: number
}

const HOUR = 3_600_000

/**
 * Finds the Monday of the week of a local date.
 *
 * @param date - A real local date.
 * @returns The Monday of that week.
 */
export function weekStart(date: string): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const value = new Date(Date.UTC(2000, month - 1, day))
  value.setUTCFullYear(year)
  return addDays(date, -((value.getUTCDay() + 6) % 7))
}

/**
 * Checks the overlap and the rest between a shift and the others (`HR-ROS-010`, `011`). A day off
 * has no instants and never conflicts.
 *
 * @param candidate - The shift being added.
 * @param others - The employee's other planned shifts, in every roster and unit (`HR-ROS-016`).
 * @param minRestHours - The fewest hours of rest.
 * @returns `overlap` when two shifts share time, else `rest_too_short` when a gap is shorter than
 * the rest, else nothing.
 */
function checkOverlapAndRest(
  candidate: WorkingShift,
  others: WorkingShift[],
  minRestHours: number,
): WorkingTimeViolation[] {
  if (candidate.startsAt === null || candidate.endsAt === null) {
    return []
  }
  const start = candidate.startsAt.getTime()
  const end = candidate.endsAt.getTime()
  let tooShort = false
  for (const other of others) {
    if (other.startsAt === null || other.endsAt === null) {
      continue
    }
    const otherStart = other.startsAt.getTime()
    const otherEnd = other.endsAt.getTime()
    if (start < otherEnd && otherStart < end) {
      return ['overlap']
    }
    const gap = start >= otherEnd ? start - otherEnd : otherStart - end
    if (gap < minRestHours * HOUR) {
      tooShort = true
    }
  }
  return tooShort ? ['rest_too_short'] : []
}

/**
 * Checks the weekly hours and the overtime (`HR-ROS-012`, `013`). The week is Monday to Sunday of
 * the shift's date. The part of the week's paid minutes above `MAX_WEEKLY_HOURS` is overtime; the
 * overtime this shift adds needs consent and must keep the week under `MAX_OVERTIME_HOURS_WEEK`.
 * The daily overtime limit is not checked (HR plan 5.5 RA13).
 *
 * @param candidate - The shift being added.
 * @param others - The employee's other planned shifts.
 * @param limits - The limits.
 * @param consent - Whether the employee gave consent for overtime on this shift.
 * @returns The violations and the overtime this shift adds.
 */
function checkWeek(
  candidate: WorkingShift,
  others: WorkingShift[],
  limits: WorkingTimeLimits,
  consent: boolean,
): WorkingTimeResult {
  const monday = weekStart(candidate.date)
  const sunday = addDays(monday, 6)
  const before = others
    .filter((other) => other.date >= monday && other.date <= sunday)
    .reduce((sum, other) => sum + other.paidMinutes, 0)
  const after = before + candidate.paidMinutes
  const regular = limits.maxWeeklyHours * 60
  const overtimeBefore = Math.max(0, before - regular)
  const overtimeAfter = Math.max(0, after - regular)
  const added = overtimeAfter - overtimeBefore
  const violations: WorkingTimeViolation[] = []
  if (added > 0 && !consent) {
    violations.push('overtime_consent_required')
  }
  if (added > 0 && overtimeAfter > limits.maxOvertimeHoursWeek * 60) {
    violations.push('overtime_limit_exceeded')
  }
  return { violations, overtimeMinutes: added }
}

/**
 * Checks the night run (`HR-ROS-015`): the days in a row with a night shift that include the
 * shift's date must not be more than `MAX_CONSECUTIVE_NIGHTS`.
 *
 * @param candidate - The shift being added.
 * @param others - The employee's other planned shifts.
 * @param max - The most nights in a row.
 * @returns `too_many_nights` or nothing.
 */
function checkNights(
  candidate: WorkingShift,
  others: WorkingShift[],
  max: number,
): WorkingTimeViolation[] {
  if (!candidate.isNight) {
    return []
  }
  const nights = new Set(
    others.filter((other) => other.isNight).map((other) => other.date),
  )
  nights.add(candidate.date)
  let run = 1
  for (let day = addDays(candidate.date, -1); nights.has(day); day = addDays(day, -1)) {
    run += 1
  }
  for (let day = addDays(candidate.date, 1); nights.has(day); day = addDays(day, 1)) {
    run += 1
  }
  return run > max ? ['too_many_nights'] : []
}

/**
 * Checks a shift against the rest of an employee's planned shifts: overlap, rest, weekly hours,
 * overtime and night runs (`HR-ROS-010` to `013`, `015`, `016`). The caller passes every planned
 * shift of the employee that can matter, whatever its unit or roster, and leaves out the shift
 * being changed.
 *
 * @param candidate - The shift being added or changed.
 * @param others - The employee's other planned shifts.
 * @param limits - The limits of the HR parameters.
 * @param consent - Whether the employee gave consent for overtime on this shift.
 * @returns The violations and the overtime the shift adds.
 */
export function checkWorkingTime(
  candidate: WorkingShift,
  others: WorkingShift[],
  limits: WorkingTimeLimits,
  consent: boolean,
): WorkingTimeResult {
  const week = checkWeek(candidate, others, limits, consent)
  const violations = [
    ...checkOverlapAndRest(candidate, others, limits.minRestHours),
    ...week.violations,
    ...checkNights(candidate, others, limits.maxConsecutiveNights),
  ]
  return { violations, overtimeMinutes: week.overtimeMinutes }
}
