import { type LocalDate } from '@repository/model/common/calendar'
import { type ProfessionalLicense } from '@repository/model/professional-license'

/**
 * Pattern of an SPK letter number: upper case letters, digits, `/`, `.` and `-`, 1 to 64
 * characters (HR plan 4.3 SP2).
 */
export const APPOINTMENT_NUMBER = /^[A-Z0-9][A-Z0-9/.-]{0,63}$/

/**
 * Longest reason of a decision.
 */
export const MAX_DECISION_REASON = 500

/**
 * Adds days to a local date.
 *
 * @param date - A `YYYY-MM-DD` date.
 * @param days - Days to add; may be negative.
 * @returns The new local date.
 */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

/**
 * Adds whole years to a local date. A 29 February that does not exist in the target year becomes
 * 1 March.
 *
 * @param date - A `YYYY-MM-DD` date.
 * @param years - Years to add.
 * @returns The new local date.
 */
export function addYears(date: LocalDate, years: number): LocalDate {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  return new Date(Date.UTC(year + years, month - 1, day))
    .toISOString()
    .slice(0, 10)
}

/**
 * The last day an SPK issued on `start` may be valid (HR plan 4.3 SP6): `SPK_VALIDITY_YEARS`
 * years for a regular one, the requested days for a temporary one, counting the first day.
 *
 * @param start - Issue date.
 * @param span - `{ years }` for a regular SPK, `{ days }` for a temporary one.
 * @returns The latest allowed last day.
 */
export function latestEnd(
  start: LocalDate,
  span: { years: number } | { days: number },
): LocalDate {
  return 'years' in span
    ? addDays(addYears(start, span.years), -1)
    : addDays(start, span.days - 1)
}

/**
 * Tells whether a licence is valid on a date: status `valid`, issued on or before it, and not
 * expired on it. Nothing expires licences yet, so the dates are read too (HR-CRD-002).
 *
 * @param license - The licence.
 * @param date - The date, a local date.
 * @returns True when the licence is valid on the date.
 */
export function isLicenseValidOn(
  license: Pick<ProfessionalLicense, 'status' | 'issue_date' | 'expiry_date'>,
  date: LocalDate,
): boolean {
  return (
    license.status === 'valid' &&
    license.issue_date <= date &&
    (license.expiry_date === null || license.expiry_date >= date)
  )
}
