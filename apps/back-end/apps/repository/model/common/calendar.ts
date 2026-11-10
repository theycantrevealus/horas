/**
 * Calendar date as `YYYY-MM-DD`, read in the time zone of the facility it belongs to
 * (`database.md` 4.4). Never a `Date` at midnight.
 */
export type LocalDate = string

/**
 * Time of day as `HH:mm` (24-hour clock), read with the facility's IANA time zone.
 */
export type LocalTime = string

/**
 * Validity range of local dates.
 *
 * @property start - First day the range applies.
 * @property end - Last day the range applies, or `null` when it is open-ended.
 */
export interface DatePeriod {
  start: LocalDate
  end: LocalDate | null
}

/**
 * Closed range of local dates: both ends are known.
 *
 * @property start - First day.
 * @property end - Last day.
 */
export interface ClosedDatePeriod {
  start: LocalDate
  end: LocalDate
}
