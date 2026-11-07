import { InvalidRequestError } from '../identity.error'

/**
 * Longest accepted password. Limits the work an attacker can force with huge inputs.
 */
export const PASSWORD_MAX_LENGTH = 128

/**
 * Shortest identifier text that is compared with the password.
 */
const MIN_COMPARED_LENGTH = 4

/**
 * Rules a new password must meet.
 *
 * @property minLength - Shortest accepted length.
 * @property personalTexts - Texts about the user (names, login identifiers) that the password must not contain.
 */
export interface PasswordPolicy {
  minLength: number
  personalTexts: readonly string[]
}

/**
 * Checks a new password against the policy: length limits and no personal texts. Length is
 * preferred over composition rules (NIST SP 800-63B), so no character classes are required.
 *
 * @param password - Proposed password.
 * @param policy - Policy to apply.
 * @throws InvalidRequestError with code `password_policy` when a rule is broken.
 */
export function assertPasswordAcceptable(
  password: string,
  policy: PasswordPolicy,
): void {
  if (password.length < policy.minLength) {
    throw new InvalidRequestError(
      'password_policy',
      `The password must have at least ${policy.minLength} characters.`,
    )
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new InvalidRequestError(
      'password_policy',
      `The password must have at most ${PASSWORD_MAX_LENGTH} characters.`,
    )
  }
  const lowered = password.toLowerCase()
  const personal = policy.personalTexts
    .map((text) => text.trim().toLowerCase())
    .filter((text) => text.length >= MIN_COMPARED_LENGTH)
  if (personal.some((text) => lowered.includes(text))) {
    throw new InvalidRequestError(
      'password_policy',
      'The password must not contain your name or login identifier.',
    )
  }
}
