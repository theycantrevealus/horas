import { Types } from 'mongoose'
import { RepositoryConflictError } from '@utility/database/error'
import {
  type Entity,
  type EntityChanges,
  type FindOneOptions,
  type ListQueryOptions,
  type NewEntity,
  type Page,
  type PaginatedQueryOptions,
  type QueryOptions,
  type Repository,
  type Timestamped,
  type UpdateOptions,
} from '@utility/database/interface'
import { systemActor, type ActorRef } from '@utility/history/actor'
import { getRequestContext } from '@utility/logger/context'
import { type AccountCredentialRepository } from '@repository/interface/account-credential'
import { type AccountRepository } from '@repository/interface/account'
import { type AccountRoleBindingRepository } from '@repository/interface/account-role-binding'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { type RoleRepository } from '@repository/interface/role'
import { type SecurityEventRepository } from '@repository/interface/security-event'
import { type Account } from '@repository/model/account'
import { type AccountCredential } from '@repository/model/account-credential'
import { type AccountRoleBinding } from '@repository/model/account-role-binding'
import { type AccountSession } from '@repository/model/account-session'
import { type Role } from '@repository/model/role'
import { type SecurityEvent } from '@repository/model/security-event'

/**
 * Smallest model the in-memory repository can store.
 */
type StoredModel = Entity &
  Timestamped & { version: number; created_by: ActorRef }

/**
 * Reads a field of a model by name.
 *
 * @param model - The model.
 * @param field - Field name.
 * @returns The field value.
 */
function read(model: object, field: string): unknown {
  return Reflect.get(model, field === 'id' ? 'id' : field)
}

/**
 * Checks one engine-neutral condition against a value.
 *
 * @param value - Field value.
 * @param condition - Conditions: `eq`, `ne`, `in`, `notIn`, `contains`, `startsWith`.
 * @returns `true` when all conditions hold.
 */
function matches(value: unknown, condition: Record<string, unknown>): boolean {
  return Object.entries(condition).every(([operator, expected]) => {
    switch (operator) {
      case 'eq':
        return expected === null ? value == null : value === expected
      case 'ne':
        return value !== expected
      case 'in':
        return Array.isArray(expected) && expected.includes(value)
      case 'notIn':
        return Array.isArray(expected) && !expected.includes(value)
      case 'contains':
        return (
          typeof value === 'string' &&
          typeof expected === 'string' &&
          value.toLowerCase().includes(expected.toLowerCase())
        )
      case 'startsWith':
        return (
          typeof value === 'string' &&
          typeof expected === 'string' &&
          value.toLowerCase().startsWith(expected.toLowerCase())
        )
      default:
        return expected === undefined
    }
  })
}

/**
 * Repository kept in memory, for tests that need real services without a database. It
 * follows the contract of `Repository`: soft-delete filtering, optimistic concurrency via
 * `expectedVersion`, `created_by` from the request context and a version counter that starts at 0
 * like the Mongo implementation. It records no change history.
 */
export class InMemoryRepository<
  M extends StoredModel,
> implements Repository<M> {
  protected readonly items = new Map<string, M>()

  /**
   * Returns one page of records.
   *
   * @param options - Query options with `withPagination: true`.
   * @returns The requested page.
   */
  findAll(options: PaginatedQueryOptions<M>): Promise<Page<M>>
  /**
   * Returns all matching records.
   *
   * @param options - Optional query options.
   * @returns The matching records.
   */
  findAll(options?: ListQueryOptions<M>): Promise<M[]>
  /**
   * Shared implementation of both overloads.
   *
   * @param options - Query options.
   * @returns The matching records or a page.
   */
  async findAll(
    options?: QueryOptions<M> & { withPagination?: boolean },
  ): Promise<M[] | Page<M>> {
    const where: Record<string, unknown> = { ...options?.where }
    const rows = [...this.items.values()]
      .filter((item) => options?.withSoft || !item.deleted_at)
      .filter((item) =>
        Object.entries(where).every(
          ([field, condition]) =>
            typeof condition !== 'object' ||
            condition === null ||
            matches(read(item, field), condition as Record<string, unknown>),
        ),
      )
      .map((item) => structuredClone(item))
    if (options?.orderBy) {
      const { field, direction } = options.orderBy
      rows.sort((left, right) => {
        const a = String(read(left, field))
        const b = String(read(right, field))
        return (direction === 'DESC' ? -1 : 1) * a.localeCompare(b)
      })
    }
    if (!options?.withPagination) {
      return rows
    }
    const limit = options.limit ?? 10
    const offset = options.offset ?? 0
    return {
      data: rows.slice(offset, offset + limit),
      totalRecords: rows.length,
      first: offset,
      rows: limit,
      totalPages: Math.ceil(rows.length / limit),
      currentPage: Math.floor(offset / limit) + 1,
    }
  }

  /**
   * Finds one record by identifier.
   *
   * @param id - Record identifier.
   * @param options - Whether to include soft-deleted records.
   * @returns The record, or `null`.
   */
  async findOne(id: string, options?: FindOneOptions): Promise<M | null> {
    const item = this.items.get(id)
    return item && (options?.withSoft || !item.deleted_at)
      ? structuredClone(item)
      : null
  }

  /**
   * Creates a record.
   *
   * @param entity - Data to store.
   * @param id - Optional identifier.
   * @returns The stored record.
   */
  async create(entity: NewEntity<M>, id?: string): Promise<M> {
    const now = new Date()
    // The model type cannot be built from its parts generically; the fields are exactly the ones the
    // Mongo repository stamps.
    const item = {
      ...entity,
      id: id ?? new Types.ObjectId().toHexString(),
      version: 0,
      schema_version: 1,
      created_by: getRequestContext()?.actor ?? systemActor('test'),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } as unknown as M
    this.items.set(item.id, item)
    return structuredClone(item)
  }

  /**
   * Updates a record.
   *
   * @param id - Record identifier.
   * @param changes - Fields to change.
   * @param options - Optional concurrency check.
   * @returns The updated record.
   */
  async update(
    id: string,
    changes: EntityChanges<M>,
    options?: UpdateOptions,
  ): Promise<M> {
    const item = this.items.get(id)
    if (!item || item.deleted_at) {
      throw new Error(`not found: ${id}`)
    }
    if (
      options?.expectedVersion !== undefined &&
      options.expectedVersion !== item.version
    ) {
      throw new RepositoryConflictError('stale version', {
        operation: 'InMemoryRepository.update',
      })
    }
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    )
    const updated = {
      ...item,
      ...defined,
      version: item.version + 1,
      updated_at: new Date(),
    }
    this.items.set(id, updated)
    return structuredClone(updated)
  }

  /**
   * Deletes a record permanently.
   *
   * @param id - Record identifier.
   */
  async delete(id: string): Promise<void> {
    this.items.delete(id)
  }

  /**
   * Marks a record as deleted.
   *
   * @param id - Record identifier.
   */
  async deleteSoft(id: string): Promise<void> {
    const item = this.items.get(id)
    if (item) {
      this.items.set(id, { ...item, deleted_at: new Date() })
    }
  }

  /**
   * Finds the first stored record that matches a predicate.
   *
   * @param predicate - Condition on the model.
   * @returns A copy of the record, or `null`.
   */
  protected find(predicate: (item: M) => boolean): M | null {
    const item = [...this.items.values()].find(predicate)
    return item ? structuredClone(item) : null
  }

  /**
   * Lists the stored records that match a predicate.
   *
   * @param predicate - Condition on the model.
   * @returns Copies of the matching records.
   */
  protected filter(predicate: (item: M) => boolean): M[] {
    return [...this.items.values()]
      .filter(predicate)
      .map((item) => structuredClone(item))
  }
}

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
