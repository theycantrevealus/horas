import { type LocalDate } from '@repository/model/common/calendar'

/**
 * Splits a local date into numbers.
 *
 * @param date - A valid `YYYY-MM-DD` date.
 * @returns Year, month (1 to 12) and day.
 */
function parts(date: LocalDate): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  return [year, month, day]
}

/**
 * Writes a year, month and day as a local date.
 *
 * @param year - Year.
 * @param month - Month, 1 to 12.
 * @param day - Day of the month.
 * @returns The local date.
 */
function format(year: number, month: number, day: number): LocalDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Adds whole months to a local date. A day that the target month does not have moves to the last
 * day of that month, so 29 February becomes 28 February in a year without it and 31 January plus one
 * month is the last day of February.
 *
 * @param date - A valid `YYYY-MM-DD` date.
 * @param months - Months to add; may be negative.
 * @returns The new local date.
 */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const [year, month, day] = parts(date)
  const total = year * 12 + (month - 1) + months
  const targetYear = Math.floor(total / 12)
  const targetMonth = total - targetYear * 12 + 1
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return format(targetYear, targetMonth, Math.min(day, lastDay))
}

/**
 * Counts the whole months from one local date to another, with the month rule of `addMonths`.
 *
 * @param from - The earlier date.
 * @param to - The later date.
 * @returns Whole months; 0 when `to` is not after `from`.
 */
export function wholeMonthsBetween(from: LocalDate, to: LocalDate): number {
  if (to <= from) {
    return 0
  }
  const [fromYear, fromMonth] = parts(from)
  const [toYear, toMonth] = parts(to)
  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth)
  while (months > 0 && addMonths(from, months) > to) {
    months -= 1
  }
  return months
}
