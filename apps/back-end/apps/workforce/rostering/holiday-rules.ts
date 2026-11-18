import { type HolidayEntry } from '@repository/model/holiday-calendar'
import { isLocalDate } from '@utility/validation/local-date'

/**
 * Limits of holiday calendars (HR plan 5.2 HC1, HC5).
 *
 * @property minYear - Earliest calendar year.
 * @property maxYear - Latest calendar year.
 * @property maxHolidays - Most holidays in one calendar, removed ones included.
 * @property nameItems - Most texts in the name of a holiday.
 * @property nameLength - Longest text of a name.
 */
export const HOLIDAY_LIMITS = {
  minYear: 2000,
  maxYear: 2100,
  maxHolidays: 400,
  nameItems: 10,
  nameLength: 200,
}

/**
 * The kinds of holiday.
 */
export const HOLIDAY_KINDS: readonly HolidayEntry['kind'][] = [
  'public',
  'collective_leave',
  'local',
]

/**
 * Cleans a calendar code: trimmed and lower-cased, 2 to 32 letters, digits or hyphens, starting
 * with a letter.
 *
 * @param value - Code as sent.
 * @returns The cleaned code, or `null` when it breaks the format.
 */
export function normalizeCalendarCode(value: string): string | null {
  const code = value.trim().toLowerCase()
  return /^[a-z][a-z0-9-]{1,31}$/.test(code) ? code : null
}

/**
 * Tells whether a value is a calendar year in the allowed range.
 *
 * @param value - Value to check.
 * @returns True for a whole year from the minimum to the maximum.
 */
export function isCalendarYear(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= HOLIDAY_LIMITS.minYear &&
    value <= HOLIDAY_LIMITS.maxYear
  )
}

/**
 * Tells whether a value is an ISO 3166-1 alpha-2 country code in upper case.
 *
 * @param value - Value to check.
 * @returns True for two upper-case letters.
 */
export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{2}$/.test(value)
}

/**
 * Tells whether a value looks like an ISO 3166-2 code of a country, for example `ID-JK` in `ID`.
 * Only the format is checked; there is no list of codes to check against.
 *
 * @param value - Value to check.
 * @param country - Country the subdivision must belong to.
 * @returns True for the country, a hyphen and 1 to 3 upper-case letters or digits.
 */
export function isSubdivisionCode(value: unknown, country: string): boolean {
  return (
    typeof value === 'string' &&
    new RegExp(`^${country}-[A-Z0-9]{1,3}$`).test(value)
  )
}

/**
 * Tells whether a value is a holiday kind.
 *
 * @param value - Value to check.
 * @returns True for `public`, `collective_leave` or `local`.
 */
export function isHolidayKind(value: unknown): value is HolidayEntry['kind'] {
  return HOLIDAY_KINDS.includes(value as HolidayEntry['kind'])
}

/**
 * Tells whether a date is a real local date inside a calendar year.
 *
 * @param date - Value to check.
 * @param year - Calendar year.
 * @returns True when the date exists and falls in the year.
 */
export function isDateInYear(date: unknown, year: number): boolean {
  return isLocalDate(date) && date.startsWith(`${String(year).padStart(4, '0')}-`)
}

/**
 * Orders holidays by date, then kind, so a calendar always reads the same way.
 *
 * @param left - One holiday.
 * @param right - Another holiday.
 * @returns A negative number when `left` comes first.
 */
export function compareHolidays(left: HolidayEntry, right: HolidayEntry): number {
  return (
    left.date.localeCompare(right.date) || left.kind.localeCompare(right.kind)
  )
}
