import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { AuthConfig } from '@configuration/auth'
import { systemActor } from '@utility/history/actor'
import {
  TRANSACTION_MANAGER,
  type TransactionManager,
} from '@utility/database/transaction'
import { AppLogger } from '@utility/logger/service'
import { type AccountCredentialRepository } from '@repository/interface/account-credential'
import { type AccountRepository } from '@repository/interface/account'
import { type AccountSessionRepository } from '@repository/interface/account-session'
import { type Account } from '@repository/model/account'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_ACCOUNT_SESSION,
} from '@repository/token'
import { accountActor, runAs } from '../actor-context'
import { type AuthenticatedUser } from '../authenticated-user'
import { InvalidRequestError, UnauthenticatedError } from '../identity.error'
import { observe } from '../observe'
import { unusableReason } from '../account/account-status'
import {
  detectIdentifierType,
  normalizeIdentifier,
} from '../account/login-identifier'
import { type ClientInfo, sha256Hex } from './client-info'
import { PasswordHasher } from './password-hasher'
import { assertPasswordAcceptable } from './password-policy'
import { SecurityAuditService } from './security-audit.service'
import { TokenService } from './token.service'

/**
 * Operation name prefix used in logs.
 */
const NAME = 'AuthenticationService'

/**
 * Smallest time between two `last_login_at` updates of one account, to limit writes.
 */
const LAST_LOGIN_UPDATE_MS = 3_600_000

/**
 * Message of every rejected login. It is the same for unknown identifiers, wrong passwords and
 * lockouts, so the response does not reveal which accounts exist.
 */
const INVALID_CREDENTIALS_MESSAGE = 'The identifier or password is not correct.'

/**
 * Input of a login.
 *
 * @property tenantId - Tenant to sign in to.
 * @property identifier - Username, email or E.164 phone number.
 * @property password - Plain password.
 * @property client - Calling client.
 */
export interface LoginInput {
  tenantId: string
  identifier: string
  password: string
  client: ClientInfo
}

/**
 * Input of a token refresh.
 *
 * @property refreshToken - Refresh token received at login or the last refresh.
 * @property client - Calling client.
 */
export interface RefreshInput {
  refreshToken: string
  client: ClientInfo
}

/**
 * Input of a password change.
 *
 * @property currentPassword - The current password.
 * @property newPassword - The new password.
 * @property client - Calling client.
 */
export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  client: ClientInfo
}

/**
 * Tokens given to the client.
 *
 * @property tokenType - Always `Bearer`.
 * @property accessToken - Short-lived JWT for the `Authorization` header.
 * @property accessTokenExpiresAt - Expiry of the access token.
 * @property refreshToken - Opaque token to get new tokens; usable once.
 * @property refreshTokenExpiresAt - Expiry of the refresh token.
 * @property mustChangePassword - When `true`, the only allowed action is changing the password.
 */
export interface TokenPair {
  tokenType: 'Bearer'
  accessToken: string
  accessTokenExpiresAt: Date
  refreshToken: string
  refreshTokenExpiresAt: Date
  mustChangePassword: boolean
}

/**
 * Authentication: password login, refresh-token rotation, logout, password change and
 * verification of access tokens. It decides who the caller is; what the caller may do is
 * decided by `AuthorizationService`.
 *
 * Security properties:
 * - Failed logins answer the same for unknown identifiers, wrong passwords and lockouts, and spend
 *   the same time, so accounts cannot be enumerated.
 * - Failed attempts are counted atomically; after the configured number the account is locked
 *   for a period. After the lockout ends, one more wrong password locks it again.
 * - Refresh tokens are stored as hashes, rotate on every use, and reuse of an old one revokes the
 *   whole token family.
 * - Access tokens carry the account's `authz_version`; a mismatch forces a refresh, so role,
 *   hold and status changes act without waiting for expiry.
 * - Accounts that require multi-factor authentication cannot sign in yet, because no second factor exists.
 */
@Injectable()
export class AuthenticationService {
  /**
   * @param accounts - Account repository.
   * @param credentials - Credential repository.
   * @param sessions - Session repository.
   * @param transactions - Transaction manager.
   * @param hasher - Password hasher.
   * @param tokens - Token service.
   * @param audit - Security event writer.
   * @param config - Typed `auth` configuration.
   * @param logger - Logger whose context is this class's name.
   */
  constructor(
    @Inject(REPOSITORY_ACCOUNT) private readonly accounts: AccountRepository,
    @Inject(REPOSITORY_ACCOUNT_CREDENTIAL)
    private readonly credentials: AccountCredentialRepository,
    @Inject(REPOSITORY_ACCOUNT_SESSION)
    private readonly sessions: AccountSessionRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly audit: SecurityAuditService,
    @Inject(AuthConfig.KEY)
    private readonly config: ConfigType<typeof AuthConfig>,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Signs a user in with an identifier and a password.
   *
   * @param input - Tenant, identifier, password and client.
   * @returns Access and refresh tokens.
   * @throws UnauthenticatedError `invalid_credentials` for any wrong identifier, password or lockout;
   * `account_unavailable` when the password is right but the account cannot be used;
   * `mfa_unavailable` when the account requires a second factor.
   */
  login(input: LoginInput): Promise<TokenPair> {
    return observe(
      this.logger,
      'login',
      `${NAME}.login`,
      () => this.doLogin(input),
      'log',
    )
  }

  /**
   * Exchanges a refresh token for new tokens. The old token stops working.
   *
   * @param input - Refresh token and client.
   * @returns New access and refresh tokens.
   * @throws UnauthenticatedError `invalid_refresh_token` when the token is unknown, expired or already used.
   */
  refresh(input: RefreshInput): Promise<TokenPair> {
    return observe(this.logger, 'token_refresh', `${NAME}.refresh`, () =>
      this.doRefresh(input),
    )
  }

  /**
   * Ends the caller's session, including the tokens already issued in its family.
   *
   * @param user - The signed-in caller.
   * @param client - Calling client.
   */
  logout(user: AuthenticatedUser, client: ClientInfo): Promise<void> {
    return observe(
      this.logger,
      'logout',
      `${NAME}.logout`,
      async () => {
        const session = await this.sessions.findOne(user.session_id)
        if (session) {
          await this.sessions.revokeFamily(
            session.family_id,
            'logout',
            new Date(),
          )
        }
        await this.audit.record({
          type: 'logout',
          tenantId: user.tenant_id,
          accountId: user.account_id,
          outcome: 'success',
          client,
        })
      },
      'log',
    )
  }

  /**
   * Changes the caller's password. Ends every other session and gives the caller a fresh one.
   * A first-time user (temporary password) becomes `active`.
   *
   * @param user - The signed-in caller.
   * @param input - Current and new password, and the client.
   * @returns New tokens.
   * @throws UnauthenticatedError `invalid_credentials` when the current password is wrong.
   * @throws InvalidRequestError `password_policy` or `password_reused` when the new password is not acceptable.
   */
  changePassword(
    user: AuthenticatedUser,
    input: ChangePasswordInput,
  ): Promise<TokenPair> {
    return observe(
      this.logger,
      'password_change',
      `${NAME}.changePassword`,
      () => this.doChangePassword(user, input),
      'log',
    )
  }

  /**
   * Verifies an access token and loads the caller, for `AuthenticationGuard`.
   * Checks the signature and expiry, that the account still exists and is usable, that its
   * `authz_version` matches, and that the session was not revoked.
   *
   * @param accessToken - Compact JWT from the `Authorization` header.
   * @returns The signed-in caller.
   * @throws UnauthenticatedError when any check fails; `token_stale` means "refresh and retry".
   */
  async authenticate(accessToken: string): Promise<AuthenticatedUser> {
    const claims = await this.tokens.verifyAccessToken(accessToken)
    const now = new Date()
    const account = await this.accounts.findOne(claims.accountId)
    if (!account || account.tenant_id !== claims.tenantId) {
      throw new UnauthenticatedError(
        'invalid_token',
        'The access token is not valid.',
      )
    }
    if (claims.authzVersion !== account.authz_version) {
      throw new UnauthenticatedError(
        'token_stale',
        'Your access changed. Refresh your tokens and try again.',
      )
    }
    if (unusableReason(account, now)) {
      throw new UnauthenticatedError(
        'account_unavailable',
        'This account cannot be used.',
      )
    }
    const session = await this.sessions.findOne(claims.sessionId)
    // A session replaced by a refresh rotation keeps working until its access token expires,
    // so requests already in flight do not fail; explicit revocation overrides the reason.
    const alive =
      session &&
      session.expires_at > now &&
      (session.revoked_at === null || session.revoke_reason === 'rotated')
    if (!alive) {
      throw new UnauthenticatedError(
        'session_ended',
        'The session has ended. Sign in again.',
      )
    }
    return {
      id: account.id,
      account_id: account.id,
      tenant_id: account.tenant_id,
      employee_id: account.employee_id,
      display_name: account.profile.display_name,
      kind: account.account_type === 'service' ? 'service' : 'account',
      session_id: session.id,
      must_change_password: claims.mustChangePassword,
    }
  }

  /**
   * Login flow, without logging.
   *
   * @param input - Login input.
   * @returns Tokens.
   */
  private async doLogin(input: LoginInput): Promise<TokenPair> {
    const now = new Date()
    const type = detectIdentifierType(input.identifier)
    const normalized = normalizeIdentifier(type, input.identifier)
    const account = await this.accounts.findByLoginIdentifier(
      input.tenantId,
      type,
      normalized,
    )
    const credential = account
      ? await this.credentials.findByAccountId(account.id)
      : null

    if (!account || !credential) {
      await this.hasher.spendVerificationTime(input.password)
      await this.rejectLogin(input, account?.id ?? null, 'unknown_identity')
      throw this.invalidCredentials()
    }

    if (credential.locked_until && credential.locked_until > now) {
      await this.hasher.spendVerificationTime(input.password)
      await this.rejectLogin(input, account.id, 'locked')
      throw this.invalidCredentials()
    }

    const matches = await this.hasher.verify(
      credential.password_hash,
      input.password,
    )
    if (!matches) {
      const attempt = await runAs(systemActor('authentication'), () =>
        this.credentials.registerFailedAttempt(
          account.id,
          {
            maxAttempts: this.config.lockout.maxAttempts,
            lockoutMs: this.config.lockout.lockoutMinutes * 60_000,
          },
          now,
        ),
      )
      await this.rejectLogin(input, account.id, 'bad_password')
      if (attempt.failed_attempts >= this.config.lockout.maxAttempts) {
        await this.audit.record({
          type: 'account_locked',
          tenantId: input.tenantId,
          accountId: account.id,
          outcome: 'failure',
          reasonCode: 'too_many_attempts',
          client: input.client,
        })
      }
      throw this.invalidCredentials()
    }

    // The password is right, so it is safe to say why the account cannot be used.
    const unusable = unusableReason(account, now)
    if (unusable) {
      await this.rejectLogin(input, account.id, unusable)
      throw new UnauthenticatedError(
        'account_unavailable',
        'This account cannot sign in. Contact your administrator.',
      )
    }
    if (account.mfa_required) {
      await this.rejectLogin(input, account.id, 'mfa_unavailable')
      throw new UnauthenticatedError(
        'mfa_unavailable',
        'A second factor is required for this account but is not available yet. Contact your administrator.',
      )
    }

    return runAs(accountActor(account), async () => {
      await this.credentials.clearFailedAttempts(account.id)
      if (this.hasher.needsRehash(credential.password_hash)) {
        await this.credentials.update(credential.id, {
          password_hash: await this.hasher.hash(input.password),
        })
      }
      const signedIn = await this.touchLastLogin(account, now)
      const pair = await this.openSession(
        signedIn,
        credential.must_change,
        now,
        input.client,
      )
      await this.audit.record({
        type: 'login_succeeded',
        tenantId: signedIn.tenant_id,
        accountId: signedIn.id,
        outcome: 'success',
        client: input.client,
      })
      return pair
    })
  }

  /**
   * Refresh flow, without logging.
   *
   * @param input - Refresh input.
   * @returns New tokens.
   */
  private async doRefresh(input: RefreshInput): Promise<TokenPair> {
    const now = new Date()
    const hash = this.tokens.hashRefreshToken(input.refreshToken)
    const used = await this.sessions.consume(hash, 'rotated', now)

    if (!used) {
      const known = await this.sessions.findByRefreshTokenHash(hash)
      if (known && known.revoke_reason === 'rotated') {
        // An already used token came back: it may have been stolen, so end the whole family.
        await this.sessions.revokeFamily(known.family_id, 'reuse_detected', now)
        await this.audit.record({
          type: 'token_reuse_detected',
          tenantId: known.tenant_id,
          accountId: known.account_id,
          outcome: 'failure',
          client: input.client,
        })
      }
      throw new UnauthenticatedError(
        'invalid_refresh_token',
        'The refresh token is not valid. Sign in again.',
      )
    }

    const account = await this.accounts.findOne(used.account_id)
    const credential = account
      ? await this.credentials.findByAccountId(account.id)
      : null
    if (!account || unusableReason(account, now)) {
      await this.sessions.revokeFamily(
        used.family_id,
        'account_unavailable',
        now,
      )
      throw new UnauthenticatedError(
        'invalid_refresh_token',
        'The refresh token is not valid. Sign in again.',
      )
    }
    return runAs(accountActor(account), async () => {
      const pair = await this.openSession(
        account,
        credential?.must_change ?? false,
        now,
        input.client,
        used.family_id,
      )
      await this.audit.record({
        type: 'token_refreshed',
        tenantId: account.tenant_id,
        accountId: account.id,
        outcome: 'success',
        client: input.client,
      })
      return pair
    })
  }

  /**
   * Password change flow, without logging.
   *
   * @param user - Signed-in caller.
   * @param input - Passwords and client.
   * @returns New tokens.
   */
  private async doChangePassword(
    user: AuthenticatedUser,
    input: ChangePasswordInput,
  ): Promise<TokenPair> {
    const now = new Date()
    const account = await this.accounts.findOne(user.account_id)
    const credential = account
      ? await this.credentials.findByAccountId(user.account_id)
      : null
    if (!account || !credential) {
      throw new UnauthenticatedError(
        'invalid_credentials',
        INVALID_CREDENTIALS_MESSAGE,
      )
    }

    const matches = await this.hasher.verify(
      credential.password_hash,
      input.currentPassword,
    )
    if (!matches) {
      await runAs(systemActor('authentication'), () =>
        this.credentials.registerFailedAttempt(
          account.id,
          {
            maxAttempts: this.config.lockout.maxAttempts,
            lockoutMs: this.config.lockout.lockoutMinutes * 60_000,
          },
          now,
        ),
      )
      await this.audit.record({
        type: 'login_failed',
        tenantId: account.tenant_id,
        accountId: account.id,
        outcome: 'failure',
        reasonCode: 'bad_current_password',
        client: input.client,
      })
      throw new UnauthenticatedError(
        'invalid_credentials',
        INVALID_CREDENTIALS_MESSAGE,
      )
    }

    assertPasswordAcceptable(input.newPassword, {
      minLength: this.config.password.minLength,
      personalTexts: [
        ...account.login_identifiers.map((item) => item.value),
        account.profile.display_name,
        account.profile.given_name ?? '',
        account.profile.family_name ?? '',
      ],
    })
    const previous = [credential.password_hash, ...credential.password_history]
    for (const hash of previous) {
      if (await this.hasher.verify(hash, input.newPassword)) {
        throw new InvalidRequestError(
          'password_reused',
          'Choose a password you have not used recently.',
        )
      }
    }
    const newHash = await this.hasher.hash(input.newPassword)

    return runAs(accountActor(account), () =>
      this.transactions.run(async () => {
        await this.credentials.update(credential.id, {
          password_hash: newHash,
          password_history: previous.slice(
            0,
            this.config.password.historyCount,
          ),
          password_changed_at: now,
          must_change: false,
          failed_attempts: 0,
          last_failed_at: null,
          locked_until: null,
        })
        const activated =
          account.status === 'pending_activation'
            ? await this.accounts.update(
                account.id,
                {
                  status: 'active',
                  status_changed_at: now,
                  authz_version: account.authz_version + 1,
                },
                { expectedVersion: account.version },
              )
            : account
        await this.sessions.revokeAllOfAccount(
          account.id,
          'password_changed',
          now,
        )
        const pair = await this.openSession(activated, false, now, input.client)
        await this.audit.record({
          type: 'password_changed',
          tenantId: account.tenant_id,
          accountId: account.id,
          outcome: 'success',
          client: input.client,
        })
        return pair
      }),
    )
  }

  /**
   * Opens a session and issues its tokens.
   *
   * @param account - The signed-in account.
   * @param mustChangePassword - Whether only a password change is allowed.
   * @param now - Current time.
   * @param client - Calling client.
   * @param familyId - Rotation family to continue; a new family when omitted.
   * @returns The tokens.
   */
  private async openSession(
    account: Account,
    mustChangePassword: boolean,
    now: Date,
    client: ClientInfo,
    familyId?: string,
  ): Promise<TokenPair> {
    const refresh = this.tokens.issueRefreshToken()
    const refreshExpiresAt = new Date(
      now.getTime() + this.config.refreshTokenTtlDays * 86_400_000,
    )
    const session = await this.sessions.create({
      tenant_id: account.tenant_id,
      account_id: account.id,
      refresh_token_hash: refresh.hash,
      family_id: familyId ?? randomUUID(),
      client: {
        app: client.app,
        user_agent_hash: sha256Hex(client.userAgent ?? ''),
      },
      facility_id: account.preferences.default_facility_id,
      authenticated_with: { method: 'password', mfa: false, at: now },
      last_seen_at: now,
      expires_at: refreshExpiresAt,
      revoked_at: null,
      revoke_reason: null,
    })
    const access = await this.tokens.signAccessToken(
      {
        accountId: account.id,
        tenantId: account.tenant_id,
        employeeId: account.employee_id,
        authzVersion: account.authz_version,
        sessionId: session.id,
        mustChangePassword,
      },
      now,
    )
    return {
      tokenType: 'Bearer',
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refreshExpiresAt,
      mustChangePassword,
    }
  }

  /**
   * Updates `last_login_at`, at most once per hour.
   *
   * @param account - The account that signed in.
   * @param now - Current time.
   * @returns The account, updated when the hour has passed.
   */
  private async touchLastLogin(account: Account, now: Date): Promise<Account> {
    const last = account.last_login_at
    if (last && now.getTime() - last.getTime() < LAST_LOGIN_UPDATE_MS) {
      return account
    }
    return this.accounts.update(account.id, { last_login_at: now })
  }

  /**
   * Records a failed login in the security log.
   *
   * @param input - Login input.
   * @param accountId - Matching account, or `null`.
   * @param reasonCode - Why it failed.
   */
  private rejectLogin(
    input: LoginInput,
    accountId: string | null,
    reasonCode: string,
  ): Promise<void> {
    return this.audit.record({
      type: 'login_failed',
      tenantId: input.tenantId,
      accountId,
      outcome: 'failure',
      reasonCode,
      client: input.client,
    })
  }

  /**
   * Builds the one error returned for every rejected credential.
   *
   * @returns The error.
   */
  private invalidCredentials(): UnauthenticatedError {
    return new UnauthenticatedError(
      'invalid_credentials',
      INVALID_CREDENTIALS_MESSAGE,
    )
  }
}
