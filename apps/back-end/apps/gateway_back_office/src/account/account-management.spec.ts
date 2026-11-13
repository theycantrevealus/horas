import { Global, Logger, Module, VersioningType } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { getModelToken } from '@nestjs/mongoose'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { Types } from 'mongoose'
import { AuthConfig } from '@configuration/auth'
import { ChangeLogConfig } from '@configuration/change-log'
import { LoggerConfig } from '@configuration/logger'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { RepositoryExceptionFilter } from '@utility/filter/repository'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { systemActor } from '@utility/history/actor'
import { runWithRequestContext } from '@utility/logger/context'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LoggerModule } from '@utility/logger/module'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_ACCOUNT_ROLE_BINDING,
  REPOSITORY_ACCOUNT_SESSION,
  REPOSITORY_LOV,
  REPOSITORY_ROLE,
  REPOSITORY_SECURITY_EVENT,
} from '@repository/token'
import { AccountEntity } from '@repository/mongo/schema/account'
import { AccountCredentialEntity } from '@repository/mongo/schema/account-credential'
import { AccountRoleBindingEntity } from '@repository/mongo/schema/account-role-binding'
import { AccountSessionEntity } from '@repository/mongo/schema/account-session'
import { RoleEntity } from '@repository/mongo/schema/role'
import { SecurityEventEntity } from '@repository/mongo/schema/security-event'
import { PasswordHasher } from '@identity/authentication/password-hasher'
import { AuthenticationGuard } from '@identity/guard/authentication.guard'
import { PermissionsGuard } from '@identity/guard/permissions.guard'
import { IdentityExceptionFilter } from '@identity/identity.filter'
import { IdentityModule } from '@identity/identity.module'
import { ALL_PERMISSIONS, PERMISSIONS } from '@identity/permission'
import {
  InMemoryAccounts,
  InMemoryBindings,
  InMemoryCredentials,
  InMemoryRoles,
  InMemorySecurityEvents,
  InMemorySessions,
} from '@identity/testing/in-memory'
import { GatewayBackOfficeController } from '../gateway.back.office.controller'
import { GatewayBackOfficeService } from '../gateway.back.office.service'
import { LovController } from '../lov/lov.controller'
import { AccountManagementModule } from './account-management.module'

/**
 * Stand-in for the global Mongo connection module: transactions run directly, and the
 * change outbox discards records (the repositories are in memory, so none are written).
 */
@Global()
@Module({
  providers: [
    {
      provide: TRANSACTION_MANAGER,
      useValue: { run: (work: () => Promise<unknown>) => work() },
    },
    { provide: CHANGE_OUTBOX, useValue: { append: async () => undefined } },
    { provide: ChangeLogConfig.KEY, useValue: { recordMaxBytes: 200_000 } },
  ],
  exports: [TRANSACTION_MANAGER, CHANGE_OUTBOX, ChangeLogConfig.KEY],
})
class FakeConnectionModule {}

/**
 * Fake LOV repository, so the guarded LOV routes can be exercised.
 */
const lov = {
  findByGroup: vi.fn(async () => [{ id: 'l1', group_name: 'gender' }]),
  create: vi.fn(async (entity: object) => ({ id: 'l2', ...entity })),
  update: vi.fn(async (id: string, changes: object) => ({ id, ...changes })),
}

/**
 * Application root of the test: the real identity module, account management gateway, guards,
 * filters and the LOV controller, as `GatewayBackOfficeModule` wires them, without MongoDB.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [AuthConfig, LoggerConfig, ChangeLogConfig],
    }),
    FakeConnectionModule,
    LoggerModule,
    IdentityModule,
    AccountManagementModule,
  ],
  controllers: [GatewayBackOfficeController, LovController],
  providers: [
    GatewayBackOfficeService,
    { provide: REPOSITORY_LOV, useValue: lov },
    { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
    { provide: APP_FILTER, useClass: IdentityExceptionFilter },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
class TestRootModule {}

/**
 * Password of the seeded administrators.
 */
const ADMIN_PASSWORD = 'Correct-Horse-Battery-9'

/**
 * Parsed HTTP response.
 *
 * @property status - Status code.
 * @property body - Parsed JSON body, or `null` when empty.
 * @property headers - Response headers.
 */
interface Reply {
  status: number
  body: Record<string, any> | null
  headers: Record<string, unknown>
}

describe('account management gateway (in-memory repositories)', () => {
  const accounts = new InMemoryAccounts()
  const credentials = new InMemoryCredentials()
  const sessions = new InMemorySessions()
  const events = new InMemorySecurityEvents()
  const roles = new InMemoryRoles()
  const bindings = new InMemoryBindings()
  let app: NestFastifyApplication
  let hasher: PasswordHasher
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()

  /**
   * Sends a request to the application.
   *
   * @param method - HTTP method.
   * @param url - Path.
   * @param token - Bearer token, when signed in.
   * @param payload - JSON body.
   * @returns The parsed response.
   */
  async function call(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    token?: string,
    payload?: object,
  ): Promise<Reply> {
    const response = await app.inject({
      method,
      url,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      payload,
    })
    return {
      status: response.statusCode,
      body: String(response.headers['content-type']).includes('json')
        ? JSON.parse(response.body)
        : null,
      headers: response.headers,
    }
  }

  /**
   * Signs in and returns the reply.
   *
   * @param tenant - Tenant to sign in to.
   * @param identifier - Login identifier.
   * @param password - Password.
   * @returns The login reply.
   */
  function login(
    tenant: string,
    identifier: string,
    password: string,
  ): Promise<Reply> {
    return call('POST', '/v1/auth/login', undefined, {
      tenantId: tenant,
      identifier,
      password,
    })
  }

  /**
   * Seeds a role directly in the repositories.
   *
   * @param tenant - Tenant of the role.
   * @param code - Role code.
   * @param permissions - Permissions of the role.
   * @returns The role identifier.
   */
  async function seedRole(
    tenant: string,
    code: string,
    permissions: readonly string[],
  ): Promise<string> {
    const role = await roles.create({
      tenant_id: tenant,
      code,
      name: [{ locale: 'en', text: code }],
      description: [],
      permissions: [...permissions],
      allowed_scopes: ['tenant'],
      assignable_by: [],
      is_system: true,
      status: 'active',
    })
    return role.id
  }

  /**
   * Seeds an active administrator with the given role and a known password.
   *
   * @param tenant - Tenant of the account.
   * @param username - Login name.
   * @param roleId - Role to bind at tenant level.
   * @returns The account identifier.
   */
  async function seedAdmin(
    tenant: string,
    username: string,
    roleId: string,
  ): Promise<string> {
    const now = new Date()
    const account = await accounts.create({
      tenant_id: tenant,
      account_type: 'workforce',
      employee_id: new Types.ObjectId().toHexString(),
      sponsor_account_id: null,
      username,
      login_identifiers: [
        {
          type: 'username',
          value: username,
          normalized: username,
          is_primary: true,
          verified_at: null,
        },
      ],
      profile: { display_name: `Admin ${username}` },
      profile_source: 'hr',
      preferences: { locale: 'en', timezone: null, default_facility_id: null },
      status: 'active',
      status_changed_at: now,
      is_open: true,
      holds: [],
      validity: { not_before: null, expires_at: null },
      mfa_required: false,
      authz_version: 1,
      last_login_at: null,
      request_id: null,
      closed: null,
    })
    await credentials.create({
      tenant_id: tenant,
      account_id: account.id,
      password_hash: await hasher.hash(ADMIN_PASSWORD),
      password_history: [],
      password_changed_at: now,
      must_change: false,
      failed_attempts: 0,
      last_failed_at: null,
      locked_until: null,
    })
    await bindings.create({
      tenant_id: tenant,
      account_id: account.id,
      role_id: roleId,
      scope: { kind: 'tenant', include_descendants: false },
      source: 'manual',
      source_ref: null,
      period: { start: now, end: null },
      granted_by: systemActor('seed'),
      approved_by: null,
      reason: 'seed',
      status: 'active',
    })
    return account.id
  }

  /**
   * Creates an account through the API and returns its identifier and temporary password.
   *
   * @param token - Administrator's access token.
   * @param username - Login name of the new account.
   * @returns Identifier and temporary password.
   */
  async function provision(
    token: string,
    username: string,
  ): Promise<{ id: string; password: string }> {
    const reply = await call('POST', '/v1/accounts', token, {
      accountType: 'workforce',
      username,
      displayName: `Staff ${username}`,
      employeeId: new Types.ObjectId().toHexString(),
    })
    expect(reply.status).toBe(201)
    return {
      id: reply.body?.account.id,
      password: reply.body?.temporaryPassword,
    }
  }

  let adminRoleId: string
  let adminToken: string

  beforeAll(async () => {
    process.env.AUTH_JWT_SECRET =
      'test-secret-that-is-long-enough-for-hs256-0123456789'
    process.env.LOG_LEVEL = 'error'
    process.env.LOG_FORMAT = 'json'
    const builder = Test.createTestingModule({ imports: [TestRootModule] })
    for (const entity of [
      AccountEntity,
      AccountCredentialEntity,
      AccountSessionEntity,
      SecurityEventEntity,
      RoleEntity,
      AccountRoleBindingEntity,
    ]) {
      builder
        .overrideProvider(getModelToken(entity.name, MONGO_MAIN_CONNECTION))
        .useValue({})
    }
    const moduleRef = await builder
      .overrideProvider(REPOSITORY_ACCOUNT)
      .useValue(accounts)
      .overrideProvider(REPOSITORY_ACCOUNT_CREDENTIAL)
      .useValue(credentials)
      .overrideProvider(REPOSITORY_ACCOUNT_SESSION)
      .useValue(sessions)
      .overrideProvider(REPOSITORY_SECURITY_EVENT)
      .useValue(events)
      .overrideProvider(REPOSITORY_ROLE)
      .useValue(roles)
      .overrideProvider(REPOSITORY_ACCOUNT_ROLE_BINDING)
      .useValue(bindings)
      .compile()
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )
    app.useLogger(false)
    app.enableVersioning({ type: VersioningType.URI })
    // Same pipe as main.ts.
    const { ValidationPipe } = await import('@nestjs/common')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    hasher = app.get(PasswordHasher)

    await runWithRequestContext(
      { correlationId: 'seed', actor: systemActor('seed') },
      async () => {
        adminRoleId = await seedRole(
          tenantId,
          'identity_admin',
          ALL_PERMISSIONS.filter((permission) =>
            permission.startsWith('identity.'),
          ),
        )
        await seedAdmin(tenantId, 'admin', adminRoleId)
        const otherRole = await seedRole(
          otherTenantId,
          'identity_admin',
          ALL_PERMISSIONS,
        )
        await seedAdmin(otherTenantId, 'other-admin', otherRole)
      },
    )
    const reply = await login(tenantId, 'admin', ADMIN_PASSWORD)
    adminToken = reply.body?.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const written: Record<string, unknown>[] = []
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map(
      (level) =>
        vi
          .spyOn(Logger.prototype, level)
          .mockImplementation((entry: unknown) => {
            if (typeof entry === 'object' && entry !== null) {
              written.push(entry as Record<string, unknown>)
            }
          }),
    )
    try {
      const account = await provision(adminToken, 'reader.target')
      written.length = 0

      const replies = [
        await call('GET', '/v1/accounts?limit=10', adminToken),
        await call('GET', `/v1/accounts/${account.id}`, adminToken),
        await call(
          'GET',
          `/v1/accounts/${account.id}/role-bindings`,
          adminToken,
        ),
        await call('GET', '/v1/roles', adminToken),
        await call('GET', '/v1/accounts/missing-account', adminToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([
        200, 200, 200, 200, 404,
      ])
      // The access log is written when the response closes.
      await vi.waitFor(() =>
        expect(
          written.filter((entry) => entry.event === 'http_request'),
        ).toHaveLength(replies.length),
      )

      expect(written.filter((entry) => entry.event !== 'http_request')).toEqual(
        [],
      )
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
  })

  it('refuses a request without a token, but serves public routes', async () => {
    const protectedReply = await call('GET', '/v1/lov/gender')
    expect(protectedReply.status).toBe(401)
    expect(protectedReply.body).toMatchObject({
      code: 'authentication_required',
    })
    expect(protectedReply.headers['www-authenticate']).toBe('Bearer')
    expect((await call('GET', '/')).status).toBe(200)
  })

  it('signs in and tells the caller who they are and what they may do', async () => {
    const reply = await login(tenantId, 'ADMIN', ADMIN_PASSWORD)
    expect(reply.status).toBe(200)
    expect(reply.headers['cache-control']).toBe('no-store')
    expect(reply.body).toMatchObject({
      tokenType: 'Bearer',
      mustChangePassword: false,
    })

    const me = await call('GET', '/v1/auth/me', reply.body?.accessToken)
    expect(me.status).toBe(200)
    expect(me.body?.permissions).toContain(PERMISSIONS.ACCOUNT_CREATE)
    expect(me.body?.permissions).not.toContain(PERMISSIONS.LOV_READ)
  })

  it('answers identically for an unknown login and a wrong password', async () => {
    const unknown = await login(tenantId, 'nobody', 'whatever-password-1')
    const wrong = await login(tenantId, 'admin', 'wrong-password-123')
    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(wrong.body).toEqual(unknown.body)
    expect(JSON.stringify(wrong.body)).not.toMatch(/locked|exist/i)
  })

  it('locks the account after repeated failures and keeps answering the same', async () => {
    const victim = await provision(adminToken, 'lock.victim')
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (await login(tenantId, 'lock.victim', 'wrong-password-123')).status,
      ).toBe(401)
    }
    const lockedReply = await login(tenantId, 'lock.victim', victim.password)
    const unknownReply = await login(tenantId, 'nobody', 'whatever-password-1')
    expect(lockedReply.status).toBe(401)
    expect(lockedReply.body).toEqual(unknownReply.body)
    expect(
      events
        .all()
        .some(
          (event) =>
            event.type === 'account_locked' && event.account_id === victim.id,
        ),
    ).toBe(true)
  })

  it('runs the whole lifecycle: provision, force a password change, grant a role, use the guarded LOV routes', async () => {
    const clerk = await provision(adminToken, 'clerk.one')

    // 1. The temporary password only allows choosing a new password.
    const first = await login(tenantId, 'clerk.one', clerk.password)
    expect(first.status).toBe(200)
    expect(first.body?.mustChangePassword).toBe(true)
    const blocked = await call('GET', '/v1/lov/gender', first.body?.accessToken)
    expect(blocked.status).toBe(403)
    expect(blocked.body).toMatchObject({ code: 'password_change_required' })

    const weak = await call(
      'POST',
      '/v1/auth/password',
      first.body?.accessToken,
      {
        currentPassword: clerk.password,
        newPassword: 'short',
      },
    )
    expect(weak.status).toBe(422)
    expect(weak.body).toMatchObject({ code: 'password_policy' })

    const changed = await call(
      'POST',
      '/v1/auth/password',
      first.body?.accessToken,
      {
        currentPassword: clerk.password,
        newPassword: 'My-New-Clerk-Passphrase-7',
      },
    )
    expect(changed.status).toBe(200)
    expect(changed.body?.mustChangePassword).toBe(false)
    const clerkToken: string = changed.body?.accessToken

    // 2. Signed in, but without any permission: forbidden, not unauthorized.
    const forbidden = await call('GET', '/v1/lov/gender', clerkToken)
    expect(forbidden.status).toBe(403)
    expect(forbidden.body).toMatchObject({ code: 'permission_denied' })
    expect((await call('POST', '/v1/accounts', clerkToken, {})).status).toBe(
      403,
    )

    // 3. The administrator creates a role and grants it.
    const role = await call('POST', '/v1/roles', adminToken, {
      code: 'lov_reader',
      name: [{ locale: 'en', text: 'LOV reader' }],
      description: [],
      permissions: [PERMISSIONS.LOV_READ],
      allowedScopes: ['tenant'],
      assignableBy: [],
    })
    expect(role.status).toBe(201)
    const unknownPermission = await call('POST', '/v1/roles', adminToken, {
      code: 'bad_role',
      name: [{ locale: 'en', text: 'Bad' }],
      description: [],
      permissions: ['made.up:permission'],
      allowedScopes: ['tenant'],
      assignableBy: [],
    })
    expect(unknownPermission.status).toBe(422)
    const grant = await call(
      'POST',
      `/v1/accounts/${clerk.id}/role-bindings`,
      adminToken,
      {
        roleId: role.body?.id,
        reason: 'Needs to read drop-downs',
      },
    )
    expect(grant.status).toBe(201)

    // 4. The old token is out of date; refreshing picks up the new access.
    const stale = await call('GET', '/v1/lov/gender', clerkToken)
    expect(stale.status).toBe(401)
    expect(stale.body).toMatchObject({ code: 'token_stale' })
    const refreshed = await call('POST', '/v1/auth/refresh', undefined, {
      refreshToken: changed.body?.refreshToken,
    })
    expect(refreshed.status).toBe(200)
    const allowed = await call(
      'GET',
      '/v1/lov/gender',
      refreshed.body?.accessToken,
    )
    expect(allowed.status).toBe(200)
    expect(allowed.body).toHaveLength(1)

    // 5. Read permission does not allow writing.
    const write = await call('POST', '/v1/lov', refreshed.body?.accessToken, {
      group_name: 'gender',
      set_value: 'X',
    })
    expect(write.status).toBe(403)
    expect(lov.create).not.toHaveBeenCalled()

    // 6. Revoking the binding takes effect on the next request.
    const revoke = await call(
      'POST',
      `/v1/accounts/${clerk.id}/role-bindings/${grant.body?.id}/revoke`,
      adminToken,
      { reason: 'No longer needed' },
    )
    expect(revoke.status).toBe(200)
    expect(
      (await call('GET', '/v1/lov/gender', refreshed.body?.accessToken)).status,
    ).toBe(401)
  })

  it('lets a role with the write permission create and change LOVs', async () => {
    const writerRole = await seedRole(tenantId, 'lov_writer', [
      PERMISSIONS.LOV_READ,
      PERMISSIONS.LOV_WRITE,
    ])
    const writerId = await runWithRequestContext(
      { correlationId: 'seed', actor: systemActor('seed') },
      () => seedAdmin(tenantId, 'lov.writer', writerRole),
    )
    expect(writerId).toBeTruthy()
    const token = (await login(tenantId, 'lov.writer', ADMIN_PASSWORD)).body
      ?.accessToken

    const created = await call('POST', '/v1/lov', token, {
      group_name: 'gender',
      set_value: 'F',
      reason: 'Add value',
    })
    expect(created.status).toBe(201)
    expect(lov.create).toHaveBeenCalledWith({
      group_name: 'gender',
      set_value: 'F',
    })
    const updated = await call('PATCH', '/v1/lov/l2', token, {
      description: 'Female',
    })
    expect(updated.status).toBe(200)
    expect(lov.update).toHaveBeenCalledWith('l2', { description: 'Female' })
    const invalid = await call('POST', '/v1/lov', token, {
      set_value: 'no-group',
    })
    expect(invalid.status).toBe(400)
  })

  it('rotates refresh tokens and ends the whole family when an old one is replayed', async () => {
    const first = await login(tenantId, 'admin', ADMIN_PASSWORD)
    const second = await call('POST', '/v1/auth/refresh', undefined, {
      refreshToken: first.body?.refreshToken,
    })
    expect(second.status).toBe(200)
    expect(second.body?.refreshToken).not.toBe(first.body?.refreshToken)

    const replay = await call('POST', '/v1/auth/refresh', undefined, {
      refreshToken: first.body?.refreshToken,
    })
    expect(replay.status).toBe(401)
    // The legitimate holder of the newest token is signed out as well.
    const newest = await call('POST', '/v1/auth/refresh', undefined, {
      refreshToken: second.body?.refreshToken,
    })
    expect(newest.status).toBe(401)
    expect(
      (await call('GET', '/v1/auth/me', second.body?.accessToken)).status,
    ).toBe(401)
    expect(
      events.all().some((event) => event.type === 'token_reuse_detected'),
    ).toBe(true)
  })

  it('signs out for good', async () => {
    const session = await login(tenantId, 'admin', ADMIN_PASSWORD)
    expect(
      (await call('POST', '/v1/auth/logout', session.body?.accessToken)).status,
    ).toBe(204)
    expect(
      (await call('GET', '/v1/auth/me', session.body?.accessToken)).status,
    ).toBe(401)
    const refresh = await call('POST', '/v1/auth/refresh', undefined, {
      refreshToken: session.body?.refreshToken,
    })
    expect(refresh.status).toBe(401)
  })

  it('suspends an account at once and restores it when the hold is lifted', async () => {
    const staff = await provision(adminToken, 'hold.target')
    const entry = await login(tenantId, 'hold.target', staff.password)
    const changed = await call(
      'POST',
      '/v1/auth/password',
      entry.body?.accessToken,
      {
        currentPassword: staff.password,
        newPassword: 'Another-Long-Passphrase-3',
      },
    )
    const token: string = changed.body?.accessToken
    expect((await call('GET', '/v1/auth/me', token)).status).toBe(200)

    const hold = await call(
      'POST',
      `/v1/accounts/${staff.id}/holds`,
      adminToken,
      {
        kind: 'suspend',
        reason: 'administrative',
      },
    )
    expect(hold.status).toBe(201)
    expect(hold.body?.status).toBe('suspended')
    expect((await call('GET', '/v1/auth/me', token)).status).toBe(401)
    const refused = await login(
      tenantId,
      'hold.target',
      'Another-Long-Passphrase-3',
    )
    expect(refused.status).toBe(401)
    expect(refused.body).toMatchObject({ code: 'account_unavailable' })

    const lifted = await call(
      'DELETE',
      `/v1/accounts/${staff.id}/holds`,
      adminToken,
    )
    expect(lifted.status).toBe(200)
    expect(lifted.body?.status).toBe('active')
    expect(
      (await login(tenantId, 'hold.target', 'Another-Long-Passphrase-3'))
        .status,
    ).toBe(200)
  })

  it('does not let an administrator lift the hold that an HR event placed', async () => {
    const staff = await provision(adminToken, 'hr.held')
    const account = (await accounts.findOne(staff.id))!
    await accounts.update(staff.id, {
      holds: [
        {
          kind: 'disable',
          reason: 'employment_ended',
          source: 'workforce',
          source_ref: 'event-1',
          placed_by: {
            account_id: null,
            display_name: 'workforce-events',
            kind: 'system',
          },
          placed_at: new Date(),
        },
      ],
      status: 'disabled',
      authz_version: account.authz_version + 1,
    })

    const lifted = await call(
      'DELETE',
      `/v1/accounts/${staff.id}/holds`,
      adminToken,
    )

    expect(lifted.status).toBe(404)
    expect(lifted.body).toMatchObject({ code: 'hold_not_found' })
    expect((await accounts.findOne(staff.id))?.status).toBe('disabled')
  })

  it('does not let an administrator reach accounts of another tenant', async () => {
    const other = (await login(otherTenantId, 'other-admin', ADMIN_PASSWORD))
      .body?.accessToken
    const victim = await provision(adminToken, 'tenant.isolated')
    expect((await call('GET', `/v1/accounts/${victim.id}`, other)).status).toBe(
      404,
    )
    expect(
      (await call('GET', `/v1/accounts/${victim.id}`, adminToken)).status,
    ).toBe(200)
    // A token of one tenant cannot be replayed against another.
    expect((await login(otherTenantId, 'admin', ADMIN_PASSWORD)).status).toBe(
      401,
    )
  })

  it('never returns secrets and never lets an administrator act on themselves', async () => {
    const list = await call('GET', '/v1/accounts?limit=100', adminToken)
    expect(list.status).toBe(200)
    expect(JSON.stringify(list.body)).not.toMatch(
      /password|argon2|refresh_token_hash/i,
    )

    const me = await call('GET', '/v1/auth/me', adminToken)
    const selfId: string = me.body?.account_id
    const selfGrant = await call(
      'POST',
      `/v1/accounts/${selfId}/role-bindings`,
      adminToken,
      {
        roleId: adminRoleId,
        reason: 'Give myself more',
      },
    )
    expect(selfGrant.status).toBe(403)
    expect(selfGrant.body).toMatchObject({ code: 'self_grant' })
    const selfHold = await call(
      'POST',
      `/v1/accounts/${selfId}/holds`,
      adminToken,
      {
        kind: 'disable',
        reason: 'security',
      },
    )
    expect(selfHold.body).toMatchObject({ code: 'self_hold' })
  })

  it('writes security events without the attempted password or login name', async () => {
    const serialized = JSON.stringify(events.all())
    expect(serialized).not.toContain('wrong-password-123')
    expect(serialized).not.toContain('whatever-password-1')
    expect(serialized).not.toContain('nobody')
    expect(events.all().map((event) => event.type)).toEqual(
      expect.arrayContaining(['login_succeeded', 'login_failed']),
    )
  })

  it('rejects stale concurrent edits with a conflict', async () => {
    const staff = await provision(adminToken, 'version.target')
    const current = await call('GET', `/v1/accounts/${staff.id}`, adminToken)
    const ok = await call('PATCH', `/v1/accounts/${staff.id}`, adminToken, {
      locale: 'id-ID',
      expectedVersion: current.body?.version,
    })
    expect(ok.status).toBe(200)
    const stale = await call('PATCH', `/v1/accounts/${staff.id}`, adminToken, {
      locale: 'en',
      expectedVersion: current.body?.version,
    })
    expect(stale.status).toBe(409)
  })
})
