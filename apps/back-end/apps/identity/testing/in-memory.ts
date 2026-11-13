import { type AccountCredentialRepository } from '@repository/interface/account-credential'
import { type AccountRepository } from '@repository/interface/account'
import { type AccountRoleBindingRepository } from '@repository/interface/account-role-binding'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { type RoleRepository } from '@repository/interface/role'
import { type ProcessedEventRepository } from '@repository/interface/processed-event'
import { type SecurityEventRepository } from '@repository/interface/security-event'
import { type Account } from '@repository/model/account'
import { type AccountCredential } from '@repository/model/account-credential'
import { type AccountRoleBinding } from '@repository/model/account-role-binding'
import { type AccountSession } from '@repository/model/account-session'
import { type ProcessedEvent } from '@repository/model/processed-event'
import { type Role } from '@repository/model/role'
import { type SecurityEvent } from '@repository/model/security-event'
import { RepositoryConflictError } from '@utility/database/error'
import { type NewEntity } from '@utility/database/interface'
import { InMemoryRepository } from '@utility/testing/in-memory-repository'

/**
 * In-memory account repository.
 */
export class InMemoryAccounts
  extends InMemoryRepository<Account>
  implements AccountRepository
{
  /**
   * Finds the account that logs in with an identifier.
   *
   * @param tenantId - Tenant.
   * @param type - Identifier kind.
   * @param normalized - Normalized value.
   * @returns The account, or `null`.
   */
  async findByLoginIdentifier(
    tenantId: string,
    type: string,
    normalized: string,
  ): Promise<Account | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.login_identifiers.some(
          (identifier) =>
            identifier.type === type && identifier.normalized === normalized,
        ),
    )
  }

  /**
   * Finds the open account of an employee.
   *
   * @param tenantId - Tenant.
   * @param employeeId - Employee identifier.
   * @returns The account, or `null`.
   */
  async findByEmployeeId(
    tenantId: string,
    employeeId: string,
  ): Promise<Account | null> {
    return this.find(
      (item) =>
        item.tenant_id === tenantId &&
        item.employee_id === employeeId &&
        item.is_open,
    )
  }
}

/**
 * In-memory credential repository.
 */
export class InMemoryCredentials
  extends InMemoryRepository<AccountCredential>
  implements AccountCredentialRepository
{
  /**
   * Finds the credentials of an account.
   *
   * @param accountId - Account identifier.
   * @returns The credentials, or `null`.
   */
  async findByAccountId(accountId: string): Promise<AccountCredential | null> {
    return this.find((item) => item.account_id === accountId)
  }

  /**
   * Counts one failed attempt and starts a lockout at the limit.
   *
   * @param accountId - Account identifier.
   * @param policy - Lockout policy.
   * @param now - Time of the attempt.
   * @returns The credentials after the attempt.
   */
  async registerFailedAttempt(
    accountId: string,
    policy: { maxAttempts: number; lockoutMs: number },
    now: Date,
  ): Promise<AccountCredential> {
    const current = await this.findByAccountId(accountId)
    if (!current) {
      throw new Error('not found')
    }
    const failed = current.failed_attempts + 1
    return this.update(current.id, {
      failed_attempts: failed,
      last_failed_at: now,
      locked_until:
        failed >= policy.maxAttempts
          ? new Date(now.getTime() + policy.lockoutMs)
          : current.locked_until,
    })
  }

  /**
   * Resets the counters.
   *
   * @param accountId - Account identifier.
   * @returns The credentials after the reset.
   */
  async clearFailedAttempts(accountId: string): Promise<AccountCredential> {
    const current = await this.findByAccountId(accountId)
    if (!current) {
      throw new Error('not found')
    }
    return this.update(current.id, { failed_attempts: 0, locked_until: null })
  }
}

/**
 * In-memory session repository.
 */
export class InMemorySessions
  extends InMemoryRepository<AccountSession>
  implements AccountSessionRepository
{
  /**
   * Finds a session by refresh token hash.
   *
   * @param refreshTokenHash - Token hash.
   * @returns The session, or `null`.
   */
  async findByRefreshTokenHash(
    refreshTokenHash: string,
  ): Promise<AccountSession | null> {
    return this.find((item) => item.refresh_token_hash === refreshTokenHash)
  }

  /**
   * Revokes a valid, unexpired session and returns it as it was.
   *
   * @param refreshTokenHash - Token hash.
   * @param reason - Revocation reason.
   * @param now - Revocation time.
   * @returns The session before revocation, or `null`.
   */
  async consume(
    refreshTokenHash: string,
    reason: string,
    now: Date,
  ): Promise<AccountSession | null> {
    const session = this.find(
      (item) =>
        item.refresh_token_hash === refreshTokenHash &&
        item.revoked_at === null &&
        item.expires_at > now,
    )
    if (!session) {
      return null
    }
    await this.update(session.id, { revoked_at: now, revoke_reason: reason })
    return session
  }

  /**
   * Revokes the valid or rotated sessions of a family.
   *
   * @param familyId - Family identifier.
   * @param reason - Revocation reason.
   * @param now - Revocation time.
   * @returns Number of sessions revoked.
   */
  async revokeFamily(
    familyId: string,
    reason: string,
    now: Date,
  ): Promise<number> {
    return this.revokeWhere((item) => item.family_id === familyId, reason, now)
  }

  /**
   * Revokes the valid or rotated sessions of an account.
   *
   * @param accountId - Account identifier.
   * @param reason - Revocation reason.
   * @param now - Revocation time.
   * @param exceptSessionId - Session to keep.
   * @returns Number of sessions revoked.
   */
  async revokeAllOfAccount(
    accountId: string,
    reason: string,
    now: Date,
    exceptSessionId?: string,
  ): Promise<number> {
    return this.revokeWhere(
      (item) => item.account_id === accountId && item.id !== exceptSessionId,
      reason,
      now,
    )
  }

  /**
   * Revokes matching sessions that are valid or were replaced by a rotation.
   *
   * @param predicate - Which sessions.
   * @param reason - Revocation reason.
   * @param now - Revocation time.
   * @returns Number of sessions revoked.
   */
  private async revokeWhere(
    predicate: (item: AccountSession) => boolean,
    reason: string,
    now: Date,
  ): Promise<number> {
    const targets = this.filter(
      (item) =>
        predicate(item) &&
        (item.revoked_at === null || item.revoke_reason === 'rotated'),
    )
    for (const target of targets) {
      await this.update(target.id, { revoked_at: now, revoke_reason: reason })
    }
    return targets.length
  }
}

/**
 * In-memory security event repository. Exposes the stored events to tests.
 */
export class InMemorySecurityEvents
  extends InMemoryRepository<SecurityEvent>
  implements SecurityEventRepository
{
  /**
   * Returns every stored event, oldest first.
   *
   * @returns The events.
   */
  all(): SecurityEvent[] {
    return this.filter(() => true)
  }
}

/**
 * In-memory role repository.
 */
export class InMemoryRoles
  extends InMemoryRepository<Role>
  implements RoleRepository
{
  /**
   * Finds a role by code.
   *
   * @param tenantId - Tenant.
   * @param code - Role code.
   * @returns The role, or `null`.
   */
  async findByCode(tenantId: string, code: string): Promise<Role | null> {
    return this.find(
      (item) => item.tenant_id === tenantId && item.code === code,
    )
  }
}

/**
 * In-memory role binding repository.
 */
export class InMemoryBindings
  extends InMemoryRepository<AccountRoleBinding>
  implements AccountRoleBindingRepository
{
  /**
   * Returns the bindings in force at a moment.
   *
   * @param tenantId - Tenant.
   * @param accountId - Account identifier.
   * @param at - Moment to evaluate.
   * @returns The bindings in force.
   */
  async findInForce(
    tenantId: string,
    accountId: string,
    at: Date,
  ): Promise<AccountRoleBinding[]> {
    return this.filter(
      (item) =>
        item.tenant_id === tenantId &&
        item.account_id === accountId &&
        item.status === 'active' &&
        item.period.start <= at &&
        (item.period.end === null || item.period.end > at),
    )
  }
}

/**
 * In-memory processed event repository. Follows the Mongo unique index on consumer and event.
 */
export class InMemoryProcessedEvents
  extends InMemoryRepository<ProcessedEvent>
  implements ProcessedEventRepository
{
  /**
   * Creates a record, refusing a second one for the same consumer and event.
   *
   * @param entity - Record data.
   * @param id - Optional identifier.
   * @returns The stored record.
   */
  override async create(
    entity: NewEntity<ProcessedEvent>,
    id?: string,
  ): Promise<ProcessedEvent> {
    if (
      [...this.items.values()].some(
        (item) =>
          item.consumer === entity.consumer &&
          item.event_id === entity.event_id,
      )
    ) {
      throw new RepositoryConflictError('duplicate processed event', {
        operation: 'ProcessedEventRepository.create',
      })
    }
    return super.create(entity, id)
  }

  /**
   * Finds the record that a consumer handled an event.
   *
   * @param consumer - Name of the consumer.
   * @param eventId - Identifier of the event.
   * @returns The record, or `null`.
   */
  async findByEvent(
    consumer: string,
    eventId: string,
  ): Promise<ProcessedEvent | null> {
    return this.find(
      (item) => item.consumer === consumer && item.event_id === eventId,
    )
  }

  /**
   * Counts the stored records, for tests.
   *
   * @returns The number of records.
   */
  size(): number {
    return this.items.size
  }
}
