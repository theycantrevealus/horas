import {
  compareLocalDates,
  isLocalDate,
} from '@utility/validation/local-date'
import { type DatePeriod } from '@repository/model/common/calendar'

/**
 * Earliest date an assignment may use.
 */
const EARLIEST_DATE = '1950-01-01'

/**
 * Years ahead of today that an assignment date may reach.
 */
const YEARS_AHEAD = 10

/**
 * Longest decision (SK) number (HR plan A18).
 */
const MAX_DECISION_NUMBER = 80

/**
 * Assignment kinds that are temporary by nature, so they need an end date (HR plan A3).
 */
const TEMPORARY_KINDS: readonly string[] = ['acting', 'secondment']

/**
 * Kind code that does not count against a position's headcount (HR plan A12).
 */
export const ACTING_KIND = 'acting'

/**
 * A problem found in the terms of an assignment.
 *
 * @property code - Stable error code.
 * @property message - Explanation for the caller.
 */
export interface PeriodProblem {
  code: 'invalid_period' | 'end_date_required' | 'period_outside_contract'
  message: string
}

/**
 * Adds days to a local date.
 *
 * @param date - A valid `YYYY-MM-DD` date.
 * @param days - Days to add; may be negative.
 * @returns The resulting local date.
 */
export function addDays(date: string, days: number): string {
  const moved = new Date(`${date}T00:00:00Z`)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

/**
 * Tells whether two periods share at least one day. An open end reaches without limit.
 *
 * @param left - First period.
 * @param right - Second period.
 * @returns True when they overlap.
 */
export function periodsOverlap(left: DatePeriod, right: DatePeriod): boolean {
  const leftStartsBeforeRightEnds =
    right.end === null || compareLocalDates(left.start, right.end) <= 0
  const rightStartsBeforeLeftEnds =
    left.end === null || compareLocalDates(right.start, left.end) <= 0
  return leftStartsBeforeRightEnds && rightStartsBeforeLeftEnds
}

/**
 * Checks the dates of a new assignment against each other, against its kind and against the
 * period of its contract (HR plan A3).
 *
 * @param period - Start and end as sent.
 * @param kindCode - Code of the assignment kind.
 * @param contract - Period of the contract the assignment runs under.
 * @param now - The current instant; a parameter so tests control it.
 * @returns The problem, or `null` when the dates are valid.
 */
export function checkAssignmentPeriod(
  period: DatePeriod,
  kindCode: string,
  contract: DatePeriod,
  now: Date = new Date(),
): PeriodProblem | null {
  const latest = new Date(now.getTime())
  latest.setUTCFullYear(latest.getUTCFullYear() + YEARS_AHEAD)
  const latestDate = latest.toISOString().slice(0, 10)
  const dates = [period.start, period.end].filter(
    (date): date is string => date !== null,
  )
  if (
    dates.some(
      (date) =>
        !isLocalDate(date) ||
        compareLocalDates(date, EARLIEST_DATE) < 0 ||
        compareLocalDates(date, latestDate) > 0,
    ) ||
    (period.end !== null && compareLocalDates(period.end, period.start) < 0)
  ) {
    return {
      code: 'invalid_period',
      message:
        'The dates must be real dates from 1950-01-01 to ten years ahead, and the end not before the start.',
    }
  }
  if (period.end === null && TEMPORARY_KINDS.includes(kindCode)) {
    return {
      code: 'end_date_required',
      message: 'An acting or secondment assignment needs an end date.',
    }
  }
  const startsInside = compareLocalDates(period.start, contract.start) >= 0
  const endsInside =
    contract.end === null ||
    (period.end !== null && compareLocalDates(period.end, contract.end) <= 0)
  if (!startsInside || !endsInside) {
    return {
      code: 'period_outside_contract',
      message: 'The assignment must lie inside the period of its contract.',
    }
  }
  return null
}

/**
 * Checks a full-time equivalent: above 0, at most 1, at most two decimals (HR plan A6).
 *
 * @param fte - Value as sent.
 * @returns True when it is valid.
 */
export function isValidAssignmentFte(fte: number): boolean {
  return (
    Number.isFinite(fte) &&
    fte > 0 &&
    fte <= 1 &&
    Number(fte.toFixed(2)) === fte
  )
}

/**
 * Cleans a decision (SK) number: trimmed, 1 to 80 characters.
 *
 * @param raw - Number as sent.
 * @returns The cleaned number, or `null` when it does not fit.
 */
export function normalizeDecisionNumber(raw: string): string | null {
  const cleaned = raw.trim()
  return cleaned.length >= 1 && cleaned.length <= MAX_DECISION_NUMBER
    ? cleaned
    : null
}

/**
 * Adds full-time equivalents without floating point drift.
 *
 * @param values - Values with at most two decimals.
 * @returns Their sum, rounded to two decimals.
 */
export function sumFte(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value * 100, 0)) / 100
}
