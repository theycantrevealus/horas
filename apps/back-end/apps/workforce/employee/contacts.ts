import { type ContactPoint } from '@repository/model/common/contact-point'

/**
 * Most work contacts an employee can hold (HR plan E9).
 */
export const MAX_WORK_CONTACTS = 5

/**
 * E.164 phone number: a plus sign, a country code that does not start with 0, up to 15 digits.
 */
const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/

/**
 * A plain check for an email address: something, an at sign, a domain with a dot.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A work contact as sent by a client.
 *
 * @property system - Phone or email.
 * @property value - The number or address.
 * @property is_primary - Preferred contact of its kind.
 */
export interface ContactInput {
  system: 'phone' | 'email'
  value: string
  is_primary?: boolean
}

/**
 * Cleans the work contacts of an employee: at most 5, phones in E.164, emails lower-cased and
 * well-formed (up to 254 characters), at most one primary per kind and none repeated. The use is
 * always `work` (personal contacts are in the private profile) and `verified_at` is not accepted
 * yet.
 *
 * @param inputs - Contacts as sent.
 * @returns The cleaned contacts, or `null` when the list breaks a rule.
 */
export function normalizeWorkContacts(
  inputs: ContactInput[],
): ContactPoint[] | null {
  if (inputs.length > MAX_WORK_CONTACTS) {
    return null
  }
  const contacts: ContactPoint[] = []
  for (const input of inputs) {
    const value =
      input.system === 'email'
        ? input.value.trim().toLowerCase()
        : input.value.trim()
    const valid =
      input.system === 'phone'
        ? PHONE_PATTERN.test(value)
        : input.system === 'email' &&
          value.length <= 254 &&
          EMAIL_PATTERN.test(value)
    if (!valid) {
      return null
    }
    contacts.push({
      system: input.system,
      value,
      use: 'work',
      is_primary: input.is_primary === true,
      verified_at: null,
    })
  }
  const keys = contacts.map(({ system, value }) => `${system}|${value}`)
  const primaries = contacts.filter(({ is_primary }) => is_primary)
  const primaryKinds = new Set(primaries.map(({ system }) => system))
  if (
    new Set(keys).size !== keys.length ||
    primaryKinds.size !== primaries.length
  ) {
    return null
  }
  return contacts
}
