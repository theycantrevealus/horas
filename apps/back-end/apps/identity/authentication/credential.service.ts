import { randomInt } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AuthConfig } from '@configuration/auth'
import { type AccountCredentialRepository } from '@repository/interface/account-credential'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { type Account } from '@repository/model/account'
import { type AccountCredential } from '@repository/model/account-credential'
import {
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_ACCOUNT_SESSION,
} from '@repository/token'
import { PasswordHasher } from './password-hasher'

/**
 * Characters of generated temporary passwords. Look-alike characters (0/O, 1/l/I) are left out
 * because the password is read from a screen and typed once.
 */
const TEMPORARY_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/**
 * Length of a generated temporary password (about 93 bits of entropy).
 */
const TEMPORARY_LENGTH = 16

/**
 * A generated temporary password and its hash.
 *
 * @property password - The plain password. Show it once to the administrator; never store or log it.
 * @property hash - Argon2id hash to store.
 */
export interface TemporaryPassword {
  password: string
  hash: string
}

/**
 * Creates and resets password credentials for account management. The login flow itself is in
 * `AuthenticationService`. Only the identity module injects the credential repository.
 */
@Injectable()
export class CredentialService {
  /**
   * @param credentials - Credential repository.
   * @param sessions - Session repository, to end sessions when a password is reset.
   * @param hasher - Password hasher.
   * @param config - Typed `auth` configuration.
   */
  constructor(
    @Inject(REPOSITORY_ACCOUNT_CREDENTIAL)
    private readonly credentials: AccountCredentialRepository,
    @Inject(REPOSITORY_ACCOUNT_SESSION)
    private readonly sessions: AccountSessionRepository,
    private readonly hasher: PasswordHasher,
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
  ) {}

  /**
   * Generates a random temporary password and hashes it. Hash outside any transaction, because
   * hashing is slow and a transaction may be retried.
   *
   * @returns The password and its hash.
   */
  async issueTemporaryPassword(): Promise<TemporaryPassword> {
    const password = Array.from(
      { length: TEMPORARY_LENGTH },
      () => TEMPORARY_ALPHABET[randomInt(TEMPORARY_ALPHABET.length)],
    ).join('')
    return { password, hash: await this.hasher.hash(password) }
  }

  /**
   * Stores the first credentials of a new account. The user must change the password at first sign-in.
   *
   * @param account - The new account.
   * @param temporary - Temporary password from `issueTemporaryPassword`.
   * @returns The stored credentials.
   */
  create(
    account: Account,
    temporary: TemporaryPassword,
  ): Promise<AccountCredential> {
    return this.credentials.create({
      tenant_id: account.tenant_id,
      account_id: account.id,
      password_hash: temporary.hash,
      password_history: [],
      password_changed_at: new Date(),
      must_change: true,
      failed_attempts: 0,
      last_failed_at: null,
      locked_until: null,
    })
  }

  /**
   * Replaces the password by a temporary one after an administrator reset: the user must change
   * it at next sign-in, the lockout is cleared and every session ends. Creates credentials
   * for accounts that had none.
   *
   * @param account - The account.
   * @param temporary - Temporary password from `issueTemporaryPassword`.
   */
  async reset(account: Account, temporary: TemporaryPassword): Promise<void> {
    const existing = await this.credentials.findByAccountId(account.id)
    if (!existing) {
      await this.create(account, temporary)
      return
    }
    await this.credentials.update(existing.id, {
      password_hash: temporary.hash,
      password_history: [
        existing.password_hash,
        ...existing.password_history,
      ].slice(0, this.config.password.historyCount),
      password_changed_at: new Date(),
      must_change: true,
      failed_attempts: 0,
      last_failed_at: null,
      locked_until: null,
    })
    await this.sessions.revokeAllOfAccount(
      account.id,
      'password_reset',
      new Date(),
    )
  }
}
