/**
 * Resolves region names, used to tell real ISO 3166-1 alpha-2 codes from random letters.
 */
const REGION_NAMES = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
})

/**
 * ISO 4217 currency codes known to the runtime.
 */
const CURRENCY_CODES: ReadonlySet<string> = new Set(
  Intl.supportedValuesOf('currency'),
)

/**
 * Tells whether a value is an assigned ISO 3166-1 alpha-2 country code, for example `ID`.
 * Upper case only. The reserved code `ZZ` (unknown region) is not accepted.
 *
 * @param value - Value to check.
 * @returns True for a known two-letter country code.
 */
export function isCountryCode(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^[A-Z]{2}$/.test(value) ||
    value === 'ZZ'
  ) {
    return false
  }
  try {
    return REGION_NAMES.of(value) !== undefined
  } catch {
    return false
  }
}

/**
 * Tells whether a value is an ISO 4217 currency code, for example `IDR`. Upper case only.
 *
 * @param value - Value to check.
 * @returns True for a known three-letter currency code.
 */
export function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && CURRENCY_CODES.has(value)
}
