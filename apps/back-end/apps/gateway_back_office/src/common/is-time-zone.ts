import { registerDecorator, type ValidationOptions } from 'class-validator'

/**
 * Checks whether a value is an IANA time zone name, such as `Asia/Jakarta`.
 *
 * @param value - Value to check.
 * @returns `true` when the runtime knows the zone.
 */
function isTimeZone(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
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
