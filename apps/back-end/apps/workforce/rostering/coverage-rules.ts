import { type Coding } from '@repository/model/common/coding'
import { type DatePeriod } from '@repository/model/common/calendar'
import {
  type CoverageMatch,
  type DayPattern,
} from '@repository/model/coverage-requirement'
import {
  compareLocalDates,
  isLocalDate,
} from '@utility/validation/local-date'

/**
 * Limits of coverage requirements (HR plan 5.3 CR5, CR7).
 *
 * @property minCount - Lowest minimum count.
 * @property maxCount - Highest minimum count.
 * @property earliestStart - Earliest start of a period.
 */
export const COVERAGE_LIMITS = {
  minCount: 1,
  maxCount: 99,
  earliestStart: '2000-01-01',
}

/**
 * The day patterns a requirement can have.
 */
export const DAY_PATTERNS: readonly DayPattern[] = [
  'all',
  'weekdays',
  'weekends_holidays',
]

/**
 * Code system name suffixes of the criteria, after an optional country prefix.
 */
export const MATCH_SYSTEMS = {
  workforceCategory: /(^|\.)workforce-category$/,
  profession: /(^|\.)profession$/,
  specialty: /(^|\.)specialty$/,
  minClinicalLevel: /(^|\.)clinical-level$/,
} as const

/**
 * Tells whether a value is a day pattern.
 *
 * @param value - Value to check.
 * @returns True for `all`, `weekdays` or `weekends_holidays`.
 */
export function isDayPattern(value: unknown): value is DayPattern {
  return DAY_PATTERNS.includes(value as DayPattern)
}

/**
 * Tells whether a value is a valid minimum count: a whole number from 1 to 99.
 *
 * @param value - Value to check.
 * @returns True when it is in range.
 */
export function isMinCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= COVERAGE_LIMITS.minCount &&
    value <= COVERAGE_LIMITS.maxCount
  )
}

/**
 * Tells whether a period is valid: a real start from 2000-01-01, and an end that is empty or on
 * or after the start.
 *
 * @param period - The period.
 * @returns True when the period is valid.
 */
export function isCoveragePeriod(period: DatePeriod): boolean {
  return (
    isLocalDate(period.start) &&
    compareLocalDates(period.start, COVERAGE_LIMITS.earliestStart) >= 0 &&
    (period.end === null ||
      (isLocalDate(period.end) &&
        compareLocalDates(period.start, period.end) <= 0))
  )
}

/**
 * Tells whether two periods share at least one day. An empty end means open-ended.
 *
 * @param left - One period.
 * @param right - Another period.
 * @returns True when they overlap.
 */
export function periodsOverlap(left: DatePeriod, right: DatePeriod): boolean {
  return (
    (left.end === null || compareLocalDates(right.start, left.end) <= 0) &&
    (right.end === null || compareLocalDates(left.start, right.end) <= 0)
  )
}

/**
 * Tells whether a period has started on a date.
 *
 * @param period - The period.
 * @param today - Today's local date in the facility's zone.
 * @returns True when the start is today or earlier.
 */
export function hasStarted(period: DatePeriod, today: string): boolean {
  return compareLocalDates(period.start, today) <= 0
}

/**
 * Tells whether two codings are the same, or both unset.
 *
 * @param left - One coding, or `null`.
 * @param right - Another coding, or `null`.
 * @returns True when both are unset or have the same system and code.
 */
function sameCoding(left: Coding | null, right: Coding | null): boolean {
  return left === null || right === null
    ? left === right
    : left.system === right.system && left.code === right.code
}

/**
 * Tells whether two sets of criteria are the same, every unset criterion matching an unset one.
 *
 * @param left - One set of criteria.
 * @param right - Another set of criteria.
 * @returns True when every criterion is equal.
 */
export function sameMatch(left: CoverageMatch, right: CoverageMatch): boolean {
  return (
    sameCoding(left.workforce_category, right.workforce_category) &&
    sameCoding(left.profession, right.profession) &&
    sameCoding(left.specialty, right.specialty) &&
    sameCoding(left.min_clinical_level, right.min_clinical_level)
  )
}
