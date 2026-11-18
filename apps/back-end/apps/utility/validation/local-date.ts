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
 * Turns a local date and time of day in an IANA time zone into the real UTC instant, so it is
 * correct across daylight saving changes (`database.md` 4.4). A local time that does not exist
 * (the hour skipped when the clocks go forward) or that happens twice (when the clocks go back)
 * answers an instant within an hour of the change; shifts do not start in those hours in the zones
 * the platform serves today.
 *
 * @param date - Local date, `YYYY-MM-DD`.
 * @param time - Time of day, `HH:mm`.
 * @param timeZone - IANA time zone name, for example `Asia/Jakarta`.
 * @returns The UTC instant of that wall time in that zone.
 * @throws RangeError when the time zone is not a valid IANA name.
 */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number]
  const [hour, minute] = time.split(':').map(Number) as [number, number]
  const wall = new Date(Date.UTC(2000, month - 1, day, hour, minute))
  wall.setUTCFullYear(year)
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  /**
   * Reads the wall clock of an instant in the zone as if it were UTC.
   *
   * @param instant - A UTC instant.
   * @returns The wall clock of that instant, as a UTC timestamp in milliseconds.
   */
  const wallOf = (instant: Date): number => {
    const parts = format.formatToParts(instant)
    const pick = (type: string): number =>
      Number(parts.find((part) => part.type === type)?.value ?? 0)
    const value = new Date(
      Date.UTC(2000, pick('month') - 1, pick('day'), pick('hour'), pick('minute')),
    )
    value.setUTCFullYear(pick('year'))
    return value.getTime()
  }
  // First guess: the wall time read as UTC, then move it by the zone's offset at that moment.
  let instant = new Date(wall.getTime() - (wallOf(wall) - wall.getTime()))
  // A second pass settles the offset when the first guess fell on the other side of a change.
  instant = new Date(wall.getTime() - (wallOf(instant) - instant.getTime()))
  return instant
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
