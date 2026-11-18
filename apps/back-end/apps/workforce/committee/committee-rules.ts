import {
  compareLocalDates,
  isLocalDate,
} from '@utility/validation/local-date'
import { type DatePeriod } from '@repository/model/common/calendar'
import { addDays } from '../assignment/assignment-rules'

/**
 * Earliest date a membership may use.
 */
const EARLIEST_DATE = '1950-01-01'

/**
 * Years ahead of today that a membership date may reach.
 */
const YEARS_AHEAD = 10

/**
 * Role codes of which a committee of a facility has at most one active holder (HR plan 2.5 M6).
 */
export const SINGLE_HOLDER_ROLES: readonly string[] = ['chair', 'secretary']

/**
 * A problem found in the dates of a new membership.
 *
 * @property code - Stable error code.
 * @property message - Explanation for the caller.
 */
export interface MembershipPeriodProblem {
  code: 'invalid_period' | 'start_in_future'
  message: string
}

/**
 * Checks the dates of a new membership (HR plan 2.5 M3 and M4).
 *
 * @param period - Start and end as sent.
 * @param today - Today in the facility's time zone.
 * @param now - The current instant; a parameter so tests control it.
 * @returns The problem, or `null` when the dates are valid.
 */
export function checkMembershipPeriod(
  period: DatePeriod,
  today: string,
  now: Date = new Date(),
): MembershipPeriodProblem | null {
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
    (period.end !== null &&
      (compareLocalDates(period.end, period.start) < 0 ||
        compareLocalDates(period.end, today) < 0))
  ) {
    return {
      code: 'invalid_period',
      message:
        'The dates must be real dates from 1950-01-01 to ten years ahead, the end not before the start and not in the past.',
    }
  }
  if (compareLocalDates(period.start, addDays(today, 1)) > 0) {
    return {
      code: 'start_in_future',
      message:
        'The membership starts later than tomorrow. Appoint on the start date.',
    }
  }
  return null
}
