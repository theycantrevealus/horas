import {
  type Account,
  type AccountHold,
  type AccountStatus,
} from '@repository/model/account'

/**
 * Why an account cannot be used right now.
 */
export type UnusableReason =
  'closed' | 'disabled' | 'suspended' | 'locked' | 'not_yet_valid' | 'expired'

/**
 * Tells why an account cannot sign in or act at a moment.
 * `pending_activation` is usable: the user may sign in to set a password.
 *
 * @param account - The account.
 * @param now - Moment to evaluate.
 * @returns The reason, or `null` when the account is usable.
 */
export function unusableReason(
  account: Pick<Account, 'status' | 'validity'>,
  now: Date,
): UnusableReason | null {
  switch (account.status) {
    case 'closed':
    case 'disabled':
    case 'suspended':
    case 'locked':
      return account.status
    default:
      break
  }
  const { not_before: notBefore, expires_at: expiresAt } = account.validity
  if (notBefore && notBefore > now) {
    return 'not_yet_valid'
  }
  if (expiresAt && expiresAt <= now) {
    return 'expired'
  }
  return null
}

/**
 * Derives the status from the holds (`account-and-workforce-collections.md` 6.1): `disabled`
 * while any `disable` hold exists, else `suspended` while any `suspend` hold exists. When the last
 * hold is lifted the account returns to `active`, or to `pending_activation` if the user never signed in.
 *
 * @param holds - Holds after the change.
 * @param current - Status before the change.
 * @param hasSignedIn - Whether the user has signed in before.
 * @returns The new status.
 */
export function deriveStatus(
  holds: readonly AccountHold[],
  current: AccountStatus,
  hasSignedIn: boolean,
): AccountStatus {
  if (current === 'closed') {
    return 'closed'
  }
  if (holds.some((hold) => hold.kind === 'disable')) {
    return 'disabled'
  }
  if (holds.some((hold) => hold.kind === 'suspend')) {
    return 'suspended'
  }
  if (current === 'suspended' || current === 'disabled') {
    return hasSignedIn ? 'active' : 'pending_activation'
  }
  return current
}
