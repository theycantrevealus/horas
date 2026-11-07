import { Injectable } from '@nestjs/common'
import * as argon2 from 'argon2'

/**
 * Argon2id parameters (OWASP minimum profile: 19 MiB, 2 passes, 1 lane). They are stored
 * inside every hash, so they can be raised later and old hashes are upgraded on the next login.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

/**
 * Hashes and verifies passwords with Argon2id.
 */
@Injectable()
export class PasswordHasher {
  private dummyHash: Promise<string> | undefined

  /**
   * Hashes a password into a PHC string with a random salt.
   *
   * @param password - Plain password.
   * @returns The Argon2id hash.
   */
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS)
  }

  /**
   * Checks a password against a hash. A malformed hash counts as a mismatch.
   *
   * @param hash - Stored PHC hash.
   * @param password - Plain password to check.
   * @returns `true` when they match.
   */
  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch {
      return false
    }
  }

  /**
   * Tells whether a hash was made with weaker parameters than the current ones.
   *
   * @param hash - Stored PHC hash.
   * @returns `true` when the password should be hashed again after a successful login.
   */
  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, ARGON2_OPTIONS)
  }

  /**
   * Spends the same time as a real verification. Used when no credentials exist, so response
   * time does not reveal whether an identifier is registered.
   *
   * @param password - Password the caller sent.
   */
  async spendVerificationTime(password: string): Promise<void> {
    this.dummyHash ??= this.hash('dummy-password-for-timing-only')
    await this.verify(await this.dummyHash, password)
  }
}
