import { type DatePeriod } from '@repository/model/common/calendar'
import { compareLocalDates, isLocalDate } from '@utility/validation/local-date'
import { addDays } from '../credentialing/appointment-rules'
import { parseLocalTime } from './shift-rules'

/**
 * Limits of a practice schedule (HR plan 5.8 PS5).
 */
export const PRACTICE_LIMITS = {
  minQuota: 1,
  maxQuota: 9999,
  earliestStart: '2000-01-01',
} as const

/**
 * Tells whether a value is an ISO weekday, 1 (Monday) to 7 (Sunday).
 *
 * @param value - The value.
 * @returns True for a whole number from 1 to 7.
 */
export function isDayOfWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}

/**
 * Tells whether a value is a valid quota: a whole number from 1 to 9999.
 *
 * @param value - The value.
 * @returns True when it is a valid quota.
 */
export function isQuota(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= PRACTICE_LIMITS.minQuota &&
    value <= PRACTICE_LIMITS.maxQuota
  )
}

/**
 * Tells whether a session has valid local times: both `HH:mm` and the end after the start on the
 * same day. An outpatient session does not run past midnight (HR plan 5.8 PS5).
 *
 * @param start - Local start.
 * @param end - Local end.
 * @returns True when the times are valid.
 */
export function areSessionTimes(start: string, end: string): boolean {
  const from = parseLocalTime(start)
  const to = parseLocalTime(end)
  return from !== null && to !== null && to > from
}

/**
 * Tells whether a period is valid: a real start from 2000-01-01, and an end that is empty or on
 * or after the start.
 *
 * @param period - The period.
 * @returns True when the period is valid.
 */
export function isSchedulePeriod(period: DatePeriod): boolean {
  return (
    isLocalDate(period.start) &&
    compareLocalDates(period.start, PRACTICE_LIMITS.earliestStart) >= 0 &&
    (period.end === null ||
      (isLocalDate(period.end) &&
        compareLocalDates(period.start, period.end) <= 0))
  )
}

/**
 * Reads the ISO weekday of a local date.
 *
 * @param date - A real local date.
 * @returns 1 (Monday) to 7 (Sunday).
 */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}

/**
 * Finds the first session date of a weekly schedule on or after a date, inside its period.
 *
 * @param dayOfWeek - ISO weekday of the schedule.
 * @param period - Validity of the schedule.
 * @param from - The earliest date to consider, for example today.
 * @returns The first session date, or `null` when the period has none from that date.
 */
export function firstSessionDate(
  dayOfWeek: number,
  period: DatePeriod,
  from: string,
): string | null {
  const start = compareLocalDates(period.start, from) >= 0 ? period.start : from
  const date = addDays(start, (dayOfWeek - isoWeekday(start) + 7) % 7)
  return period.end !== null && compareLocalDates(date, period.end) > 0
    ? null
    : date
}

/**
 * Tells whether two periods share at least one day. An empty end means open-ended.
 *
 * @param left - One period.
 * @param right - Another period.
 * @returns True when they overlap.
 */
export function periodsShareDays(left: DatePeriod, right: DatePeriod): boolean {
  return (
    (left.end === null || compareLocalDates(right.start, left.end) <= 0) &&
    (right.end === null || compareLocalDates(left.start, right.end) <= 0)
  )
}

/**
 * Tells whether two sessions of one weekday overlap in time. Sessions that only touch (one ends
 * when the next starts) do not overlap.
 *
 * @param left - One session's local start and end.
 * @param right - Another session's local start and end.
 * @returns True when they overlap.
 */
export function sessionsOverlap(
  left: { start: string; end: string },
  right: { start: string; end: string },
): boolean {
  return left.start < right.end && right.start < left.end
}
