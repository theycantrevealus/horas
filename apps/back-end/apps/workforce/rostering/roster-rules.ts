import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type RosterStatus } from '@repository/model/roster'
import { compareLocalDates, isLocalDate } from '@utility/validation/local-date'
import { addDays } from '../credentialing/appointment-rules'

/**
 * Lengths of a roster period, the values of the parameter `ROSTER_PERIOD` (HR plan 5.4 RS3).
 */
export type RosterPeriodKind = 'month' | 'week' | 'two_weeks'

/**
 * The status moves a roster can make (HR spec 8.3, HR plan 5.4 RS5). `approved` and `closed` have
 * the moves that approval and the period allow; the service decides between `submitted` and a
 * direct publication from the setting `ROSTER_APPROVAL_REQUIRED`.
 */
export const ROSTER_TRANSITIONS: Readonly<Record<RosterStatus, readonly RosterStatus[]>> = {
  draft: ['submitted', 'published'],
  submitted: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: ['closed'],
  closed: [],
}

/**
 * Tells whether a roster may move from one status to another.
 *
 * @param from - Current status.
 * @param to - Wanted status.
 * @returns True when the move exists.
 */
export function canMove(from: RosterStatus, to: RosterStatus): boolean {
  return ROSTER_TRANSITIONS[from].includes(to)
}

/**
 * Tells whether a local date falls on a Monday.
 *
 * @param date - A real local date.
 * @returns True for a Monday.
 */
function isMonday(date: string): boolean {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const value = new Date(Date.UTC(2000, month - 1, day))
  value.setUTCFullYear(year)
  return value.getUTCDay() === 1
}

/**
 * Finds the last day of the calendar month of a local date.
 *
 * @param date - A real local date.
 * @returns The last day of that month.
 */
function lastDayOfMonth(date: string): string {
  const [year, month] = date.split('-').map(Number) as [number, number]
  const pad = (value: number): string => String(value).padStart(4, '0')
  const nextFirst =
    month === 12
      ? `${pad(year + 1)}-01-01`
      : `${pad(year)}-${String(month + 1).padStart(2, '0')}-01`
  return addDays(nextFirst, -1)
}

/**
 * Tells whether a period has the length that `ROSTER_PERIOD` asks for: `month` is the first to the
 * last day of one calendar month, `week` a Monday to the Sunday after it, and `two_weeks` a Monday
 * to the Sunday after the next.
 *
 * @param kind - The value of `ROSTER_PERIOD`.
 * @param period - The period as sent.
 * @returns True when the dates are real and the period matches.
 */
export function matchesRosterPeriod(
  kind: RosterPeriodKind,
  period: ClosedDatePeriod,
): boolean {
  if (!isLocalDate(period.start) || !isLocalDate(period.end)) {
    return false
  }
  switch (kind) {
    case 'month':
      return (
        period.start.endsWith('-01') &&
        period.end === lastDayOfMonth(period.start)
      )
    case 'week':
      return isMonday(period.start) && period.end === addDays(period.start, 6)
    case 'two_weeks':
      return isMonday(period.start) && period.end === addDays(period.start, 13)
  }
}

/**
 * Tells whether a period is over: its last day is before today.
 *
 * @param period - The period.
 * @param today - Today's local date in the facility's zone.
 * @returns True when the last day has passed.
 */
export function hasPeriodEnded(period: ClosedDatePeriod, today: string): boolean {
  return compareLocalDates(period.end, today) < 0
}
