/**
 * Limits of the `properties` of a code concept (HR plan C5).
 */
const MAX_KEYS = 30
const MAX_LIST_ITEMS = 50
const MAX_TEXT = 500
const MAX_BYTES = 4096
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/

/**
 * Tells whether a value is a single property value: text, a finite number, a boolean or `null`.
 *
 * @param value - Value to check.
 * @returns True for a scalar value within the limits.
 */
function isScalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.length <= MAX_TEXT)
  )
}

/**
 * Checks the shape of the `properties` of a code concept: a plain JSON object with at most
 * 30 keys in lower snake case, values that are text, numbers, booleans, `null` or flat lists of
 * those, and at most 4 KB when serialized. What the properties mean is checked separately, per
 * code system (`system-rules.ts`).
 *
 * @param properties - Value as sent.
 * @returns A copy of the properties, or `null` when the shape breaks a rule.
 */
export function normalizeProperties(
  properties: unknown,
): Record<string, unknown> | null {
  if (
    typeof properties !== 'object' ||
    properties === null ||
    Array.isArray(properties)
  ) {
    return null
  }
  const entries = Object.entries(properties)
  if (entries.length > MAX_KEYS) {
    return null
  }
  const copy: Record<string, unknown> = {}
  for (const [key, value] of entries) {
    const valid =
      KEY_PATTERN.test(key) &&
      (isScalar(value) ||
        (Array.isArray(value) &&
          value.length <= MAX_LIST_ITEMS &&
          value.every(isScalar)))
    if (!valid) {
      return null
    }
    copy[key] = Array.isArray(value) ? [...value] : value
  }
  return Buffer.byteLength(JSON.stringify(copy)) <= MAX_BYTES ? copy : null
}
