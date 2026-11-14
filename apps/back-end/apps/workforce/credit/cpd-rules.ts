import {
  compareLocalDates,
  isLocalDate,
  todayUtc,
} from '@utility/validation/local-date'
import { addDays } from '../assignment/assignment-rules'

/**
 * Earliest activity date a credit record may use.
 */
const EARLIEST_DATE = '1950-01-01'

/**
 * Most points one record may carry (HR plan 3.2 CR5). A guess that catches typing mistakes; it is
 * not a rule of the regulation.
 */
export const MAX_POINTS = 500

/**
 * Longest activity title, provider and review reason.
 */
export const MAX_TITLE = 200
export const MAX_REASON = 500

/**
 * Checks a point value: above 0, at most `MAX_POINTS`, at most two decimals.
 *
 * @param points - Value as sent.
 * @returns True when it is valid.
 */
export function isValidPoints(points: number): boolean {
  return (
    Number.isFinite(points) &&
    points > 0 &&
    points <= MAX_POINTS &&
    Number(points.toFixed(2)) === points
  )
}

/**
 * Checks the date of an activity: a real date from 1950-01-01 to tomorrow (UTC). Credits are not
 * earned in the future (HR plan 3.2 CR4).
 *
 * @param date - Date as sent.
 * @param now - The current instant; a parameter so tests control it.
 * @returns True when it is valid.
 */
export function isValidActivityDate(date: string, now: Date = new Date()): boolean {
  return (
    isLocalDate(date) &&
    compareLocalDates(date, EARLIEST_DATE) >= 0 &&
    compareLocalDates(date, addDays(todayUtc(now), 1)) <= 0
  )
}

/**
 * Most points a stored total may carry (HR plan 3.2 CR10). A guess that catches typing mistakes.
 */
export const MAX_TOTAL = 10000

/**
 * Checks a stored total: at least 0, at most `MAX_TOTAL`, at most two decimals.
 *
 * @param total - Value as sent.
 * @returns True when it is valid.
 */
export function isValidTotal(total: number): boolean {
  return (
    Number.isFinite(total) &&
    total >= 0 &&
    total <= MAX_TOTAL &&
    Number(total.toFixed(2)) === total
  )
}

/**
 * Checks the counting cycle of a total: two real dates from 1950-01-01 to ten years ahead, the
 * end not before the start.
 *
 * @param start - First day.
 * @param end - Last day.
 * @param now - The current instant; a parameter so tests control it.
 * @returns True when the cycle is valid.
 */
export function isValidCycle(
  start: string,
  end: string,
  now: Date = new Date(),
): boolean {
  const latest = new Date(now.getTime())
  latest.setUTCFullYear(latest.getUTCFullYear() + 10)
  const latestDate = latest.toISOString().slice(0, 10)
  return (
    isLocalDate(start) &&
    isLocalDate(end) &&
    compareLocalDates(start, EARLIEST_DATE) >= 0 &&
    compareLocalDates(end, latestDate) <= 0 &&
    compareLocalDates(start, end) <= 0
  )
}

/**
 * Adds point values without floating point drift.
 *
 * @param values - Values with at most two decimals.
 * @returns Their sum, rounded to two decimals.
 */
export function sumPoints(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value * 100, 0)) / 100
}
