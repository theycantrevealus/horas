import { type ClosedDatePeriod, type LocalDate } from '@repository/model/common/calendar'
import { addDays } from '../assignment/assignment-rules'
import { addMonths, wholeMonthsBetween } from './dates'

/**
 * Finds the entitlement period that contains a date (HR plan 8.2 LB2). A `calendar_year` runs from
 * 1 January to 31 December. A `service_year` runs from the anniversary of the service start on or
 * before the date to the day before the next anniversary; an anniversary on 29 February is 28
 * February in a year without it. A date before the service started answers the first service year.
 *
 * @param period - `calendar_year` or `service_year`.
 * @param serviceStart - First day of the current service.
 * @param date - The date to place.
 * @returns The first and last day of the period.
 */
export function entitlementPeriod(
  period: 'calendar_year' | 'service_year',
  serviceStart: LocalDate,
  date: LocalDate,
): ClosedDatePeriod {
  if (period === 'calendar_year') {
    const year = date.slice(0, 4)
    return { start: `${year}-01-01`, end: `${year}-12-31` }
  }
  const years = Math.floor(wholeMonthsBetween(serviceStart, date) / 12)
  return {
    start: addMonths(serviceStart, years * 12),
    end: addDays(addMonths(serviceStart, (years + 1) * 12), -1),
  }
}

/**
 * Tells whether an employee has served the minimum months by the first day of a period (HR plan 8.2
 * LB3).
 *
 * @param serviceStart - First day of the current service.
 * @param periodStart - First day of the entitlement period.
 * @param minMonths - Months of service the policy asks for.
 * @returns True when the whole months of service on that day reach the minimum.
 */
export function hasMinService(
  serviceStart: LocalDate,
  periodStart: LocalDate,
  minMonths: number,
): boolean {
  return wholeMonthsBetween(serviceStart, periodStart) >= minMonths
}
