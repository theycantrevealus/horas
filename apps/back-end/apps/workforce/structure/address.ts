import { type Address } from '@repository/model/common/address'
import { isCountryCode } from '@utility/validation/iso-codes'

/**
 * Format of an ISO 3166-2 subdivision code, for example `ID-JK`.
 */
const SUBDIVISION_PATTERN = /^[A-Z]{2}-[A-Z0-9]{1,3}$/

/**
 * Most address lines and administrative levels an address can hold.
 */
const MAX_LINES = 5
const MAX_ADMIN_LEVELS = 6

/**
 * Trims a text and drops it when it is empty or too long.
 *
 * @param value - Text to clean.
 * @param max - Longest text allowed.
 * @returns The trimmed text, or `null` when empty or too long.
 */
function clean(value: string, max: number): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null
}

/**
 * Checks and cleans an address: a real ISO 3166-1 country, a subdivision that looks like
 * ISO 3166-2, at most 5 lines and 6 administrative levels, and no empty or too long text.
 *
 * @param address - Address as sent.
 * @returns The cleaned address, or `null` when it breaks a rule.
 */
export function normalizeAddress(address: Address): Address | null {
  if (
    !isCountryCode(address.country) ||
    (address.subdivision !== undefined &&
      !SUBDIVISION_PATTERN.test(address.subdivision)) ||
    address.lines.length > MAX_LINES ||
    address.admin_levels.length > MAX_ADMIN_LEVELS
  ) {
    return null
  }
  const lines = address.lines.map((line) => clean(line, 200))
  const levels = address.admin_levels.map((level) => ({
    level: level.level,
    code: level.code === undefined ? undefined : clean(level.code, 32),
    name: clean(level.name, 120),
  }))
  const city = address.city === undefined ? undefined : clean(address.city, 100)
  const postalCode =
    address.postal_code === undefined
      ? undefined
      : clean(address.postal_code, 20)
  if (
    lines.some((line) => line === null) ||
    levels.some(
      (level) =>
        level.name === null ||
        level.code === null ||
        !Number.isInteger(level.level) ||
        level.level < 1 ||
        level.level > MAX_ADMIN_LEVELS,
    ) ||
    city === null ||
    postalCode === null
  ) {
    return null
  }
  return {
    use: address.use,
    lines: lines as string[],
    admin_levels: levels.map((level) => ({
      level: level.level,
      ...(level.code === undefined ? {} : { code: level.code as string }),
      name: level.name as string,
    })),
    ...(city === undefined ? {} : { city }),
    ...(address.subdivision === undefined
      ? {}
      : { subdivision: address.subdivision }),
    ...(postalCode === undefined ? {} : { postal_code: postalCode }),
    country: address.country,
  }
}
