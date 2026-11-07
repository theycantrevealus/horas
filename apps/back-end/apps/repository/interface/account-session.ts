import { type Repository } from '@utility/database/interface'
import { type AccountSession } from '@repository/model/account-session'

/**
 * Session data access. Inject it with `REPOSITORY_ACCOUNT_SESSION`.
 * Only the authentication service may use it.
 */
export interface AccountSessionRepository extends Repository<AccountSession> {
  /**
   * Finds a session by the hash of its refresh token.
   *
   * @param refreshTokenHash - SHA-256 of the refresh token.
   * @returns The session, or `null` when none matches.
   */
  findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AccountSession | null>

  /**
   * Revokes a valid session atomically and returns it as it was. Only one of several parallel
   * callers gets it, so a refresh token can be used once.
   *
   * @param refreshTokenHash - SHA-256 of the refresh token.
   * @param reason - Why the session ends, for example `rotated`.
   * @param now - Revocation time.
   * @returns The session before revocation, or `null` when it was already revoked or does not exist.
   */
  consume(
    refreshTokenHash: string,
    reason: string,
    now: Date,
  ): Promise<AccountSession | null>

  /**
   * Revokes every valid or rotated session of a rotation family, so no access token of the family stays usable.
   *
   * @param familyId - Family identifier.
   * @param reason - Why the sessions end.
   * @param now - Revocation time.
   * @returns Number of sessions revoked.
   */
  revokeFamily(familyId: string, reason: string, now: Date): Promise<number>

  /**
   * Revokes every valid or rotated session of an account.
   *
   * @param accountId - Account identifier.
   * @param reason - Why the sessions end.
   * @param now - Revocation time.
   * @param exceptSessionId - Session to keep, for example the one that changed the password.
   * @returns Number of sessions revoked.
   */
  revokeAllOfAccount(
    accountId: string,
    reason: string,
    now: Date,
    exceptSessionId?: string,
  ): Promise<number>
}
