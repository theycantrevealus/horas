/**
 * Format of a shift code after trimming and upper-casing: 1 to 8 letters or digits, for example
 * `P`, `ND` or `M2` (HR plan 5.1 SH2).
 */
const CODE_PATTERN = /^[A-Z0-9]{1,8}$/

/**
 * Format of a local time `HH:mm`, from `00:00` to `23:59` (HR plan 5.1 SH4).
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * Limits of a shift definition (HR plan 5.1 SH7).
 */
export const LIMITS = {
  units: 100,
} as const

/**
 * Cleans a shift code: trimmed and upper case.
 *
 * @param raw - Code as sent.
 * @returns The cleaned code, or `null` when it does not fit the shape.
 */
export function normalizeShiftCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase()
  return CODE_PATTERN.test(cleaned) ? cleaned : null
}

/**
 * Reads a local time as minutes from midnight.
 *
 * @param value - A time like `07:30`.
 * @returns The minutes from midnight, or `null` when it is not an `HH:mm` time.
 */
export function parseLocalTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/**
 * Counts the minutes between the start and the end of a shift. An end earlier than the start
 * means the next day (HR plan 5.1 SH4). The caller refuses an equal start and end.
 *
 * @param start - Start, in minutes from midnight.
 * @param end - End, in minutes from midnight.
 * @returns How many minutes the shift lasts.
 */
export function shiftMinutes(start: number, end: number): number {
  return end > start ? end - start : end + 24 * 60 - start
}
