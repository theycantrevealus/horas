import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * Tells whether a value is a calendar date written as `YYYY-MM-DD` that exists, for example
 * `2028-02-29` but not `2026-02-30`. A local date is read in the time zone of the facility it
 * belongs to (`database.md` 4.4), so it has no time and no zone.
 *
 * @param value - Value to check.
 * @returns True for a real calendar date in that format.
 */
export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  // `Date.UTC` treats years 0 to 99 as 1900 to 1999, so build the year explicitly.
  date.setUTCFullYear(year)
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Compares two local dates.
 *
 * @param left - First local date.
 * @param right - Second local date.
 * @returns A negative number when `left` is earlier, 0 when equal, a positive number when later.
 */
export function compareLocalDates(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/**
 * Tells whether a range of local dates is valid: both ends are real dates and the end, when
 * there is one, is not before the start.
 *
 * @param period - The range; `end` is `null` for an open-ended range.
 * @returns True when the range is valid.
 */
export function isValidPeriod(period: {
  start: string
  end: string | null
}): boolean {
  return (
    isLocalDate(period.start) &&
    (period.end === null ||
      (isLocalDate(period.end) &&
        compareLocalDates(period.start, period.end) <= 0))
  )
}

/**
 * Today's date in UTC as a local date. Used where a rule has no facility, and so no time zone.
 *
 * @param now - The current instant; a parameter so tests control it.
 * @returns The UTC calendar date.
 */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * Today's date in a time zone as a local date. A facility's "today" is the date on the wall
 * clock of its own zone, which differs from the UTC date for part of every day.
 *
 * @param timeZone - IANA time zone name, for example `Asia/Jakarta`.
 * @param now - The current instant; a parameter so tests control it.
 * @returns The calendar date in that zone.
 * @throws RangeError when the time zone is not a valid IANA name.
 */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const pick = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year').padStart(4, '0')}-${pick('month')}-${pick('day')}`
}

/**
 * Validates that a property is a local date (`YYYY-MM-DD`).
 *
 * @param options - Standard class-validator options.
 * @returns A property decorator.
 */
export function IsLocalDate(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isLocalDate',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: {
        message: `${String(propertyKey)} must be a date like 2026-01-31`,
        ...options,
      },
      validator: { validate: isLocalDate },
    })
}
