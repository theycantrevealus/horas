import {
  type LoginIdentifier,
  type LoginIdentifierType,
} from '@repository/model/account'

/**
 * Pattern of an E.164 phone number: `+`, then 6 to 15 digits.
 */
const E164_PATTERN = /^\+\d{6,15}$/

/**
 * Guesses what kind of identifier a login input is: an `@` means email, an E.164 number means
 * phone, anything else is a username. Usernames cannot contain `@` (see the account DTO), so the guess is unambiguous.
 *
 * @param raw - Text the user typed.
 * @returns The identifier kind.
 */
export function detectIdentifierType(raw: string): LoginIdentifierType {
  const text = raw.trim()
  if (text.includes('@')) {
    return 'email'
  }
  return E164_PATTERN.test(text.replace(/[\s()-]/g, '')) ? 'phone' : 'username'
}

/**
 * Normalizes an identifier for lookup and uniqueness: Unicode NFKC and lower case for username
 * and email, digits with a leading `+` for phone.
 *
 * @param type - Identifier kind.
 * @param raw - Identifier as entered.
 * @returns The normalized value.
 */
export function normalizeIdentifier(
  type: LoginIdentifierType,
  raw: string,
): string {
  const text = raw.trim()
  if (type === 'phone') {
    return `+${text.replace(/\D/g, '')}`
  }
  return text.normalize('NFKC').toLowerCase()
}

/**
 * Builds the stored form of a login identifier.
 *
 * @param type - Identifier kind.
 * @param raw - Identifier as entered.
 * @param isPrimary - Whether it is the preferred identifier of its kind.
 * @returns The login identifier, not yet verified.
 */
export function toLoginIdentifier(
  type: LoginIdentifierType,
  raw: string,
  isPrimary: boolean,
): LoginIdentifier {
  return {
    type,
    value: raw.trim(),
    normalized: normalizeIdentifier(type, raw),
    is_primary: isPrimary,
    verified_at: null,
  }
}
