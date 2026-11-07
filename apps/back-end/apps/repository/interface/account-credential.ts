import { type Repository } from '@utility/database/interface'
import { type AccountCredential } from '@repository/model/account-credential'

/**
 * Lockout policy applied when a login fails.
 *
 * @property maxAttempts - Failed attempts that trigger a lockout.
 * @property lockoutMs - Length of the lockout in milliseconds.
 */
export interface LockoutPolicy {
  maxAttempts: number
  lockoutMs: number
}

/**
 * Credential data access. Inject it with `REPOSITORY_ACCOUNT_CREDENTIAL`.
 * Only the authentication service and account provisioning may use it.
 */
export interface AccountCredentialRepository extends Repository<AccountCredential> {
  /**
   * Finds the credentials of an account.
   *
   * @param accountId - Account identifier.
   * @returns The credentials, or `null` for accounts without a password.
   */
  findByAccountId(accountId: string): Promise<AccountCredential | null>

  /**
   * Counts one failed login atomically, so parallel guesses cannot bypass the lockout.
   * Starts a lockout when the count reaches the policy limit.
   *
   * @param accountId - Account identifier.
   * @param policy - Lockout policy.
   * @param now - Time of the attempt.
   * @returns The credentials after the attempt.
   */
  registerFailedAttempt(
    accountId: string,
    policy: LockoutPolicy,
    now: Date,
  ): Promise<AccountCredential>

  /**
   * Resets the failed-attempt counter and lockout after a successful login.
   *
   * @param accountId - Account identifier.
   * @returns The credentials after the reset.
   */
  clearFailedAttempts(accountId: string): Promise<AccountCredential>
}
