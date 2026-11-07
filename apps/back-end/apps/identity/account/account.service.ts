import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AuthConfig } from '@configuration/auth'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { type ActorRef } from '@utility/history/actor'
import { withChangeReason } from '@utility/history/reason'
import { type Page } from '@utility/database/interface'
import { AppLogger } from '@utility/logger/service'
import { type AccountRepository } from '@repository/interface/account'
import { type AccountRoleBindingRepository } from '@repository/interface/account-role-binding'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { type RoleRepository } from '@repository/interface/role'
import {
  type Account,
  type AccountHold,
  type AccountPreferences,
  type AccountProfile,
  type AccountStatus,
  type AccountType,
  type LoginIdentifier,
} from '@repository/model/account'
import { type AccountRoleBinding } from '@repository/model/account-role-binding'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_ROLE_BINDING,
  REPOSITORY_ACCOUNT_SESSION,
  REPOSITORY_ROLE,
} from '@repository/token'
import { type AuthenticatedUser } from '../authenticated-user'
import { CredentialService } from '../authentication/credential.service'
import { SecurityAuditService } from '../authentication/security-audit.service'
import { AuthorizationService } from '../authorization/authorization.service'
import {
  ConflictError,
  ForbiddenError,
  InvalidRequestError,
  NotFoundError,
} from '../identity.error'
import { observe } from '../observe'
import { deriveStatus } from './account-status'
import { normalizeIdentifier, toLoginIdentifier } from './login-identifier'

/**
 * Operation name prefix used in logs.
 */
const NAME = 'AccountService'

/**
 * Milliseconds in a day.
 */
const DAY_MS = 86_400_000

/**
 * Input to create an account.
 *
 * @property accountType - `workforce` (linked to an employee) or `external` (sponsored outsider).
 * @property username - Login name; no `@`.
 * @property email - Optional login email.
 * @property displayName - Name to show.
 * @property givenName - Given name.
 * @property familyName - Family name.
 * @property employeeId - Employee to link; required for `workforce`.
 * @property sponsorAccountId - Responsible workforce account; required for `external`.
 * @property locale - BCP 47 language tag; defaults to `en`.
 * @property notBefore - First moment of use.
 * @property expiresAt - Last moment of use; required for `external`.
 * @property mfaRequired - Whether a second factor is mandatory.
 * @property reason - Why the account is created, for the change history.
 */
export interface CreateAccountInput {
  accountType: AccountType
  username: string
  email?: string
  displayName: string
  givenName?: string
  familyName?: string
  employeeId?: string
  sponsorAccountId?: string
  locale?: string
  notBefore?: Date
  expiresAt?: Date
  mfaRequired?: boolean
  reason?: string
}

/**
 * Result of creating an account.
 *
 * @property account - The created account.
 * @property temporaryPassword - Plain temporary password. It is shown once and never stored in plain form.
 */
export interface CreatedAccount {
  account: Account
  temporaryPassword: string
}

/**
 * Filters for listing accounts.
 *
 * @property status - Only accounts in this status.
 * @property accountType - Only this kind of account.
 * @property search - Text the username contains.
 * @property limit - Page size.
 * @property offset - Records to skip.
 */
export interface ListAccountsQuery {
  status?: AccountStatus
  accountType?: AccountType
  search?: string
  limit?: number
  offset?: number
}

/**
 * Fields of an account an administrator may change.
 *
 * @property displayName - Name to show (local profiles only).
 * @property givenName - Given name (local profiles only).
 * @property familyName - Family name (local profiles only).
 * @property locale - BCP 47 language tag.
 * @property timezone - IANA time zone, or `null` to use the facility's.
 * @property mfaRequired - Whether a second factor is mandatory.
 * @property notBefore - First moment of use, or `null`.
 * @property expiresAt - Last moment of use, or `null`.
 * @property expectedVersion - Version the administrator read; the update fails if the account changed since.
 * @property reason - Why, for the change history.
 */
export interface UpdateAccountInput {
  displayName?: string
  givenName?: string
  familyName?: string
  locale?: string
  timezone?: string | null
  mfaRequired?: boolean
  notBefore?: Date | null
  expiresAt?: Date | null
  expectedVersion?: number
  reason?: string
}

/**
 * Input to place a hold.
 *
 * @property kind - `suspend` (temporary) or `disable` (until a new approved request).
 * @property reason - `administrative` or `security`.
 * @property notes - Free-text note.
 * @property expectedVersion - Version the administrator read.
 */
export interface PlaceHoldInput {
  kind: 'suspend' | 'disable'
  reason: 'administrative' | 'security'
  notes?: string
  expectedVersion?: number
}

/**
 * Input to grant a role at tenant level.
 *
 * @property roleId - Role to grant.
 * @property reason - Why access is granted; required for manual bindings.
 * @property startsAt - First moment; defaults to now.
 * @property endsAt - Last moment, or omitted for open-ended.
 */
export interface GrantRoleInput {
  roleId: string
  reason: string
  startsAt?: Date
  endsAt?: Date
}

/**
 * Account management for one tenant: provisioning, profile, holds, password reset, sessions and role bindings.
 * Every method takes the caller's tenant and refuses accounts of other tenants as "not found".
 *
 * Not built yet, by decision: the account request and approval flow (`6.10`), validation that the
 * employee exists in HRM (no `WORKFORCE_DIRECTORY` port yet), the two-person rule for privileged
 * roles, and scoped (non-tenant) role bindings.
 */
@Injectable()
export class AccountService {
  /**
   * @param accounts - Account repository.
   * @param sessions - Session repository.
   * @param roles - Role repository.
   * @param bindings - Role binding repository.
   * @param transactions - Transaction manager.
   * @param credentials - Credential management.
   * @param authorization - Authorization service, for the grantor's roles.
   * @param audit - Security event writer.
   * @param config - Typed `auth` configuration.
   * @param logger - Logger whose context is this class's name.
   */
  constructor(
    @Inject(REPOSITORY_ACCOUNT) private readonly accounts: AccountRepository,
    @Inject(REPOSITORY_ACCOUNT_SESSION)
    private readonly sessions: AccountSessionRepository,
    @Inject(REPOSITORY_ROLE) private readonly roles: RoleRepository,
    @Inject(REPOSITORY_ACCOUNT_ROLE_BINDING)
    private readonly bindings: AccountRoleBindingRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    private readonly credentials: CredentialService,
    private readonly authorization: AuthorizationService,
    private readonly audit: SecurityAuditService,
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Creates an account in `pending_activation` with a generated temporary password. The user
   * must change the password at first sign-in.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The account.
   * @returns The account and its temporary password.
   * @throws InvalidRequestError for a wrong link, sponsor or validity.
   * @throws ConflictError when the employee has an account or a login identifier is taken.
   */
  create(tenantId: string, input: CreateAccountInput): Promise<CreatedAccount> {
    return observe(
      this.logger,
      'account_create',
      `${NAME}.create`,
      async () => {
        const now = new Date()
        await this.assertLinkAllowed(tenantId, input, now)
        const identifiers = await this.buildIdentifiers(tenantId, input)
        const temporary = await this.credentials.issueTemporaryPassword()
        const reason = input.reason ?? 'Account provisioned'

        const account = await withChangeReason(reason, () =>
          this.transactions.run(async () => {
            const created = await this.accounts.create({
              tenant_id: tenantId,
              account_type: input.accountType,
              employee_id: input.employeeId ?? null,
              sponsor_account_id: input.sponsorAccountId ?? null,
              username: input.username.trim(),
              login_identifiers: identifiers,
              profile: this.buildProfile(input),
              profile_source:
                input.accountType === 'workforce' ? 'hr' : 'local',
              preferences: {
                locale: input.locale ?? 'en',
                timezone: null,
                default_facility_id: null,
              },
              status: 'pending_activation',
              status_changed_at: now,
              is_open: true,
              holds: [],
              validity: {
                not_before: input.notBefore ?? null,
                expires_at: input.expiresAt ?? null,
              },
              mfa_required: input.mfaRequired ?? false,
              authz_version: 1,
              last_login_at: null,
              request_id: null,
              closed: null,
            })
            await this.credentials.create(created, temporary)
            return created
          }),
        )
        return { account, temporaryPassword: temporary.password }
      },
      'log',
    )
  }

  /**
   * Returns one account of the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @returns The account.
   * @throws NotFoundError `account_not_found`.
   */
  get(tenantId: string, id: string): Promise<Account> {
    return this.load(tenantId, id)
  }

  /**
   * Lists the accounts of the tenant, one page at a time.
   *
   * @param tenantId - Tenant of the caller.
   * @param query - Filters and paging.
   * @returns One page of accounts.
   */
  list(tenantId: string, query: ListAccountsQuery): Promise<Page<Account>> {
    return this.accounts.findAll({
      where: {
        tenant_id: { eq: tenantId },
        ...(query.status ? { status: { eq: query.status } } : {}),
        ...(query.accountType
          ? { account_type: { eq: query.accountType } }
          : {}),
        ...(query.search ? { username: { contains: query.search } } : {}),
      },
      orderBy: { field: 'username' },
      withPagination: true,
      limit: query.limit,
      offset: query.offset,
    })
  }

  /**
   * Changes the profile, preferences, MFA requirement or validity of an account. The name of a
   * workforce account comes from HRM and cannot be edited here.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param input - Fields to change.
   * @returns The updated account.
   * @throws InvalidRequestError `profile_managed_by_hr`, `account_closed` or `invalid_validity`.
   * @throws RepositoryConflictError when `expectedVersion` is stale (HTTP 409).
   */
  update(
    tenantId: string,
    id: string,
    input: UpdateAccountInput,
  ): Promise<Account> {
    return observe(
      this.logger,
      'account_update',
      `${NAME}.update`,
      async () => {
        const account = await this.load(tenantId, id)
        this.assertOpen(account)
        const nameChange =
          input.displayName !== undefined ||
          input.givenName !== undefined ||
          input.familyName !== undefined
        if (nameChange && account.profile_source === 'hr') {
          throw new InvalidRequestError(
            'profile_managed_by_hr',
            'The name of this account comes from the employee record and cannot be edited here.',
          )
        }
        const validity = {
          not_before:
            input.notBefore === undefined
              ? account.validity.not_before
              : input.notBefore,
          expires_at:
            input.expiresAt === undefined
              ? account.validity.expires_at
              : input.expiresAt,
        }
        this.assertValidity(account.account_type, validity, new Date())

        const profile: AccountProfile = {
          ...account.profile,
          ...(input.displayName ? { display_name: input.displayName } : {}),
          ...(input.givenName !== undefined
            ? { given_name: input.givenName }
            : {}),
          ...(input.familyName !== undefined
            ? { family_name: input.familyName }
            : {}),
        }
        const preferences: AccountPreferences = {
          ...account.preferences,
          ...(input.locale ? { locale: input.locale } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        }
        return this.withReason(input.reason, () =>
          this.accounts.update(
            account.id,
            {
              profile,
              preferences,
              validity,
              ...(input.mfaRequired !== undefined
                ? { mfa_required: input.mfaRequired }
                : {}),
            },
            { expectedVersion: input.expectedVersion },
          ),
        )
      },
      'log',
    )
  }

  /**
   * Places a manual hold on an account and ends its sessions. The status follows the holds.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param actor - Administrator placing the hold.
   * @param input - The hold.
   * @returns The updated account.
   * @throws ForbiddenError `self_hold` when the administrator targets their own account.
   * @throws ConflictError `hold_exists` when the same hold is already in place.
   */
  placeHold(
    tenantId: string,
    id: string,
    actor: AuthenticatedUser,
    input: PlaceHoldInput,
  ): Promise<Account> {
    return observe(
      this.logger,
      'account_hold_place',
      `${NAME}.placeHold`,
      async () => {
        const account = await this.load(tenantId, id)
        this.assertOpen(account)
        if (account.id === actor.account_id) {
          throw new ForbiddenError(
            'self_hold',
            'You cannot place a hold on your own account.',
          )
        }
        const exists = account.holds.some(
          (hold) =>
            hold.source === 'identity' &&
            hold.kind === input.kind &&
            hold.reason === input.reason,
        )
        if (exists) {
          throw new ConflictError(
            'hold_exists',
            'This hold is already in place.',
          )
        }
        const now = new Date()
        const hold: AccountHold = {
          kind: input.kind,
          reason: input.reason,
          source: 'identity',
          source_ref: null,
          placed_by: this.toActorRef(actor),
          placed_at: now,
          ...(input.notes ? { notes: input.notes } : {}),
        }
        const holds = [...account.holds, hold]
        return withChangeReason(
          `Hold placed: ${input.kind}, ${input.reason}`,
          () =>
            this.transactions.run(async () => {
              const updated = await this.accounts.update(
                account.id,
                this.statusChange(account, holds, now),
                { expectedVersion: input.expectedVersion ?? account.version },
              )
              await this.sessions.revokeAllOfAccount(
                account.id,
                'hold_placed',
                now,
              )
              return updated
            }),
        )
      },
      'log',
    )
  }

  /**
   * Lifts the temporary (`suspend`) holds that administrators placed. A `disable` hold can only
   * be lifted through an approved account request, which is not built yet.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param expectedVersion - Version the administrator read.
   * @returns The updated account.
   * @throws NotFoundError `hold_not_found` when there is no hold to lift.
   * @throws InvalidRequestError `disable_requires_request` when only a disable hold exists.
   */
  liftHolds(
    tenantId: string,
    id: string,
    expectedVersion?: number,
  ): Promise<Account> {
    return observe(
      this.logger,
      'account_hold_lift',
      `${NAME}.liftHolds`,
      async () => {
        const account = await this.load(tenantId, id)
        this.assertOpen(account)
        const liftable = (hold: AccountHold): boolean =>
          hold.source === 'identity' && hold.kind === 'suspend'
        if (!account.holds.some(liftable)) {
          if (account.holds.some((hold) => hold.source === 'identity')) {
            throw new InvalidRequestError(
              'disable_requires_request',
              'A disabled account can only be re-enabled through an approved account request.',
            )
          }
          throw new NotFoundError('hold_not_found', 'There is no hold to lift.')
        }
        const holds = account.holds.filter((hold) => !liftable(hold))
        return withChangeReason('Hold lifted', () =>
          this.accounts.update(
            account.id,
            this.statusChange(account, holds, new Date()),
            { expectedVersion: expectedVersion ?? account.version },
          ),
        )
      },
      'log',
    )
  }

  /**
   * Replaces the password by a generated temporary one. The user must change it at next sign-in,
   * the lockout is cleared and every session ends.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param actor - Administrator resetting the password.
   * @returns The plain temporary password, shown once.
   * @throws ForbiddenError `self_reset` when the administrator targets their own account.
   */
  resetPassword(
    tenantId: string,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<string> {
    return observe(
      this.logger,
      'password_reset',
      `${NAME}.resetPassword`,
      async () => {
        const account = await this.load(tenantId, id)
        this.assertOpen(account)
        if (account.id === actor.account_id) {
          throw new ForbiddenError(
            'self_reset',
            'Use the change-password action for your own account.',
          )
        }
        const temporary = await this.credentials.issueTemporaryPassword()
        await withChangeReason('Password reset by administrator', () =>
          this.transactions.run(() =>
            this.credentials.reset(account, temporary),
          ),
        )
        await this.audit.record({
          type: 'password_reset',
          tenantId,
          accountId: account.id,
          outcome: 'success',
        })
        return temporary.password
      },
      'log',
    )
  }

  /**
   * Ends every session of an account.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @returns Number of sessions ended.
   */
  revokeSessions(tenantId: string, id: string): Promise<number> {
    return observe(
      this.logger,
      'session_revoke',
      `${NAME}.revokeSessions`,
      async () => {
        const account = await this.load(tenantId, id)
        const count = await this.sessions.revokeAllOfAccount(
          account.id,
          'revoked_by_administrator',
          new Date(),
        )
        await this.audit.record({
          type: 'session_revoked',
          tenantId,
          accountId: account.id,
          outcome: 'success',
        })
        return count
      },
      'log',
    )
  }

  /**
   * Lists the role bindings of an account.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @returns The bindings, newest first.
   */
  async listBindings(
    tenantId: string,
    id: string,
  ): Promise<AccountRoleBinding[]> {
    const account = await this.load(tenantId, id)
    return this.bindings.findAll({
      where: {
        tenant_id: { eq: tenantId },
        account_id: { eq: account.id },
      },
      orderBy: { field: 'created_at', direction: 'DESC' },
    })
  }

  /**
   * Grants a role to an account at tenant level and bumps the account's `authz_version`, so
   * its tokens are refreshed.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param actor - Administrator granting the role.
   * @param input - The grant.
   * @returns The binding.
   * @throws ForbiddenError `self_grant` or `role_not_assignable`.
   * @throws NotFoundError `role_not_found`.
   * @throws InvalidRequestError `scope_not_allowed` or `invalid_period`.
   * @throws ConflictError `binding_exists`.
   */
  grantRole(
    tenantId: string,
    id: string,
    actor: AuthenticatedUser,
    input: GrantRoleInput,
  ): Promise<AccountRoleBinding> {
    return observe(
      this.logger,
      'binding_grant',
      `${NAME}.grantRole`,
      async () => {
        const account = await this.load(tenantId, id)
        this.assertOpen(account)
        if (account.id === actor.account_id) {
          throw new ForbiddenError(
            'self_grant',
            'You cannot grant roles to your own account.',
          )
        }
        const role = await this.roles.findOne(input.roleId)
        if (!role || role.tenant_id !== tenantId || role.status !== 'active') {
          throw new NotFoundError('role_not_found', 'Role not found.')
        }
        if (!role.allowed_scopes.includes('tenant')) {
          throw new InvalidRequestError(
            'scope_not_allowed',
            'This role cannot be granted for the whole tenant.',
          )
        }
        if (role.assignable_by.length > 0) {
          const held = await this.authorization.roleCodesOf(actor)
          if (!role.assignable_by.some((code) => held.has(code))) {
            throw new ForbiddenError(
              'role_not_assignable',
              'You are not allowed to grant this role.',
            )
          }
        }
        const now = new Date()
        const start = input.startsAt ?? now
        if (input.endsAt && input.endsAt <= start) {
          throw new InvalidRequestError(
            'invalid_period',
            'The end of the period must be after its start.',
          )
        }
        const inForce = await this.bindings.findInForce(
          tenantId,
          account.id,
          now,
        )
        if (
          inForce.some(
            (binding) =>
              binding.role_id === role.id && binding.scope.kind === 'tenant',
          )
        ) {
          throw new ConflictError(
            'binding_exists',
            'The account already holds this role.',
          )
        }
        const granter = this.toActorRef(actor)
        return withChangeReason(input.reason, () =>
          this.transactions.run(async () => {
            const binding = await this.bindings.create({
              tenant_id: tenantId,
              account_id: account.id,
              role_id: role.id,
              scope: { kind: 'tenant', include_descendants: false },
              source: 'manual',
              source_ref: null,
              period: { start, end: input.endsAt ?? null },
              granted_by: granter,
              approved_by: null,
              reason: input.reason,
              status: 'active',
            })
            await this.accounts.update(
              account.id,
              { authz_version: account.authz_version + 1 },
              { expectedVersion: account.version },
            )
            return binding
          }),
        )
      },
      'log',
    )
  }

  /**
   * Revokes a manual role binding and bumps the account's `authz_version`.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @param bindingId - Binding identifier.
   * @param reason - Why access is withdrawn.
   * @returns The revoked binding.
   * @throws NotFoundError `binding_not_found`.
   * @throws InvalidRequestError `derived_binding` for bindings the derivation job owns, `binding_not_active`.
   */
  revokeBinding(
    tenantId: string,
    id: string,
    bindingId: string,
    reason: string,
  ): Promise<AccountRoleBinding> {
    return observe(
      this.logger,
      'binding_revoke',
      `${NAME}.revokeBinding`,
      async () => {
        const account = await this.load(tenantId, id)
        const binding = await this.bindings.findOne(bindingId)
        if (
          !binding ||
          binding.tenant_id !== tenantId ||
          binding.account_id !== account.id
        ) {
          throw new NotFoundError('binding_not_found', 'Binding not found.')
        }
        if (binding.source === 'derived') {
          throw new InvalidRequestError(
            'derived_binding',
            'This binding follows the employee record and cannot be revoked by hand.',
          )
        }
        if (binding.status !== 'active') {
          throw new InvalidRequestError(
            'binding_not_active',
            'This binding is no longer active.',
          )
        }
        const now = new Date()
        return withChangeReason(reason, () =>
          this.transactions.run(async () => {
            const revoked = await this.bindings.update(binding.id, {
              status: 'revoked',
              period: { start: binding.period.start, end: now },
            })
            await this.accounts.update(
              account.id,
              { authz_version: account.authz_version + 1 },
              { expectedVersion: account.version },
            )
            return revoked
          }),
        )
      },
      'log',
    )
  }

  /**
   * Loads an account and refuses accounts of other tenants as missing.
   *
   * @param tenantId - Tenant of the caller.
   * @param id - Account identifier.
   * @returns The account.
   * @throws NotFoundError `account_not_found`.
   */
  private async load(tenantId: string, id: string): Promise<Account> {
    const account = await this.accounts.findOne(id)
    if (!account || account.tenant_id !== tenantId) {
      throw new NotFoundError('account_not_found', 'Account not found.')
    }
    return account
  }

  /**
   * Rejects changes to a closed account.
   *
   * @param account - The account.
   */
  private assertOpen(account: Account): void {
    if (account.status === 'closed') {
      throw new InvalidRequestError('account_closed', 'This account is closed.')
    }
  }

  /**
   * Checks the link rules of the account type (`5.1`): workforce needs an employee without an
   * account, external needs an active workforce sponsor and a bounded validity.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The new account.
   * @param now - Current time.
   */
  private async assertLinkAllowed(
    tenantId: string,
    input: CreateAccountInput,
    now: Date,
  ): Promise<void> {
    if (input.accountType === 'service') {
      throw new InvalidRequestError(
        'service_account_unsupported',
        'Service accounts are not supported yet.',
      )
    }
    if (input.accountType === 'workforce') {
      if (!input.employeeId || input.sponsorAccountId) {
        throw new InvalidRequestError(
          'invalid_account_link',
          'A workforce account needs an employee and no sponsor.',
        )
      }
      if (await this.accounts.findByEmployeeId(tenantId, input.employeeId)) {
        throw new ConflictError(
          'employee_has_account',
          'This employee already has an account.',
        )
      }
    } else {
      if (input.employeeId || !input.sponsorAccountId) {
        throw new InvalidRequestError(
          'invalid_account_link',
          'An external account needs a sponsor and no employee.',
        )
      }
      const sponsor = await this.accounts.findOne(input.sponsorAccountId)
      if (
        !sponsor ||
        sponsor.tenant_id !== tenantId ||
        sponsor.account_type !== 'workforce' ||
        sponsor.status !== 'active'
      ) {
        throw new InvalidRequestError(
          'invalid_sponsor',
          'The sponsor must be an active workforce account.',
        )
      }
    }
    this.assertValidity(
      input.accountType,
      {
        not_before: input.notBefore ?? null,
        expires_at: input.expiresAt ?? null,
      },
      now,
    )
  }

  /**
   * Checks a validity period: ordered, and for external accounts bounded by the configured maximum.
   *
   * @param type - Account type.
   * @param validity - Validity to check.
   * @param now - Current time.
   */
  private assertValidity(
    type: AccountType,
    validity: { not_before: Date | null; expires_at: Date | null },
    now: Date,
  ): void {
    const { not_before: start, expires_at: end } = validity
    if (start && end && end <= start) {
      throw new InvalidRequestError(
        'invalid_validity',
        'The end of the validity must be after its start.',
      )
    }
    if (type !== 'external') {
      return
    }
    const latest = now.getTime() + this.config.externalAccountMaxDays * DAY_MS
    if (!end || end <= now || end.getTime() > latest) {
      throw new InvalidRequestError(
        'invalid_validity',
        `An external account must expire within ${this.config.externalAccountMaxDays} days.`,
      )
    }
  }

  /**
   * Builds the login identifiers and checks that none is taken in the tenant.
   *
   * @param tenantId - Tenant of the caller.
   * @param input - The new account.
   * @returns The identifiers.
   * @throws ConflictError `login_identifier_taken`.
   */
  private async buildIdentifiers(
    tenantId: string,
    input: CreateAccountInput,
  ): Promise<LoginIdentifier[]> {
    const identifiers = [toLoginIdentifier('username', input.username, true)]
    if (input.email) {
      identifiers.push(toLoginIdentifier('email', input.email, true))
    }
    for (const identifier of identifiers) {
      const taken = await this.accounts.findByLoginIdentifier(
        tenantId,
        identifier.type,
        normalizeIdentifier(identifier.type, identifier.value),
      )
      if (taken) {
        throw new ConflictError(
          'login_identifier_taken',
          'This username or email is already in use.',
        )
      }
    }
    return identifiers
  }

  /**
   * Builds the profile of a new account.
   *
   * @param input - The new account.
   * @returns The profile.
   */
  private buildProfile(input: CreateAccountInput): AccountProfile {
    return {
      display_name: input.displayName.trim(),
      ...(input.givenName ? { given_name: input.givenName } : {}),
      ...(input.familyName ? { family_name: input.familyName } : {}),
    }
  }

  /**
   * Builds the account changes that follow a change of holds: new status and a bumped `authz_version`.
   *
   * @param account - The account before the change.
   * @param holds - Holds after the change.
   * @param now - Current time.
   * @returns The changes.
   */
  private statusChange(
    account: Account,
    holds: AccountHold[],
    now: Date,
  ): {
    holds: AccountHold[]
    status: AccountStatus
    status_changed_at: Date
    authz_version: number
  } {
    const status = deriveStatus(
      holds,
      account.status,
      account.last_login_at !== null,
    )
    return {
      holds,
      status,
      status_changed_at:
        status === account.status ? account.status_changed_at : now,
      authz_version: account.authz_version + 1,
    }
  }

  /**
   * Builds the actor snapshot of the signed-in caller.
   *
   * @param user - The caller.
   * @returns The actor.
   */
  private toActorRef(user: AuthenticatedUser): ActorRef {
    return {
      account_id: user.account_id,
      display_name: user.display_name,
      kind: user.kind,
    }
  }

  /**
   * Runs `work` with a change reason when one is given.
   *
   * @param reason - Why the data changes, or `undefined`.
   * @param work - Code that writes through repositories.
   * @returns What `work` returns.
   */
  private withReason<T>(reason: string | undefined, work: () => T): T {
    return reason ? withChangeReason(reason, work) : work()
  }
}
