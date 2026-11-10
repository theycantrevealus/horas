import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * Returns the canonical IANA name of a time zone, such as `Asia/Jakarta` for `asia/jakarta`.
 * Offsets (`+07:00`, `UTC+7`) are not IANA names and are refused.
 *
 * @param value - Value to check.
 * @returns The canonical name, or `null` when the runtime does not know the zone.
 */
export function canonicalTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[A-Za-z]/.test(value)) {
    return null
  }
  try {
    return (
      new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions()
        .timeZone || null
    )
  } catch {
    return null
  }
}

/**
 * Checks whether a value is an IANA time zone name, such as `Asia/Jakarta`.
 *
 * @param value - Value to check.
 * @returns `true` when the runtime knows the zone.
 */
export function isTimeZone(value: unknown): boolean {
  return canonicalTimeZone(value) !== null
}

/**
 * Validates that a property is an IANA time zone name.
 *
 * @param options - Standard class-validator options.
 * @returns A property decorator.
 */
export function IsTimeZone(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name: 'isTimeZone',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: {
        message: `${String(propertyKey)} must be an IANA time zone`,
        ...options,
      },
      validator: { validate: isTimeZone },
    })
}
