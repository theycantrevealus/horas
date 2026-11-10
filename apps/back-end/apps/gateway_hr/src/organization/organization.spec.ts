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
import { systemActor } from '@utility/history/actor'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { runWithRequestContext } from '@utility/logger/context'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LoggerModule } from '@utility/logger/module'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_ACCOUNT_ROLE_BINDING,
  REPOSITORY_ACCOUNT_SESSION,
  REPOSITORY_ORGANIZATION,
  REPOSITORY_ROLE,
  REPOSITORY_SECURITY_EVENT,
} from '@repository/token'
import { AccountEntity } from '@repository/mongo/schema/account'
import { AccountCredentialEntity } from '@repository/mongo/schema/account-credential'
import { AccountRoleBindingEntity } from '@repository/mongo/schema/account-role-binding'
import { AccountSessionEntity } from '@repository/mongo/schema/account-session'
import { OrganizationEntity } from '@repository/mongo/schema/organization'
import { RoleEntity } from '@repository/mongo/schema/role'
import { SecurityEventEntity } from '@repository/mongo/schema/security-event'
import { AuthenticationService } from '@identity/authentication/authentication.service'
import { PasswordHasher } from '@identity/authentication/password-hasher'
import { AuthenticationGuard } from '@identity/guard/authentication.guard'
import { PermissionsGuard } from '@identity/guard/permissions.guard'
import { IdentityExceptionFilter } from '@identity/identity.filter'
import { IdentityModule } from '@identity/identity.module'
import { PERMISSIONS } from '@identity/permission'
import {
  InMemoryAccounts,
  InMemoryBindings,
  InMemoryCredentials,
  InMemoryRoles,
  InMemorySecurityEvents,
  InMemorySessions,
} from '@identity/testing/in-memory'
import { InMemoryOrganizations } from '@workforce/testing/in-memory'
import { WorkforceExceptionFilter } from '@workforce/workforce.filter'
import { GatewayHrController } from '../gateway.hr.controller'
import { OrganizationManagementModule } from './organization-management.module'

/**
 * Stand-in for the global connection module: transactions, change outbox and configuration.
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
 * The HR gateway without Mongo: same filters, guards and interceptor as `GatewayHrModule`.
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
    OrganizationManagementModule,
  ],
  controllers: [GatewayHrController],
  providers: [
    { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
    { provide: APP_FILTER, useClass: IdentityExceptionFilter },
    { provide: APP_FILTER, useClass: WorkforceExceptionFilter },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
class TestRootModule {}

const PASSWORD = 'Correct-Horse-Battery-9'

interface Reply {
  status: number
  body: Record<string, any> | null
}

describe('organization endpoints (in-memory repositories)', () => {
  const accounts = new InMemoryAccounts()
  const credentials = new InMemoryCredentials()
  const sessions = new InMemorySessions()
  const events = new InMemorySecurityEvents()
  const roles = new InMemoryRoles()
  const bindings = new InMemoryBindings()
  const organizations = new InMemoryOrganizations()
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()
  let app: NestFastifyApplication
  let hasher: PasswordHasher
  let writerToken: string
  let readerToken: string
  let otherTenantToken: string

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
    method: 'GET' | 'POST' | 'PATCH',
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
    }
  }

  /**
   * Seeds an active account with a role holding the given permissions, and signs it in.
   *
   * @param tenant - Tenant of the account.
   * @param username - Login name.
   * @param permissions - Permissions of its role.
   * @returns The access token.
   */
  async function seedAndLogin(
    tenant: string,
    username: string,
    permissions: readonly string[],
  ): Promise<string> {
    const now = new Date()
    const role = await roles.create({
      tenant_id: tenant,
      code: `role-${username}`,
      name: [{ locale: 'en', text: username }],
      description: [],
      permissions: [...permissions],
      allowed_scopes: ['tenant'],
      assignable_by: [],
      is_system: true,
      status: 'active',
    })
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
      profile: { display_name: username },
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
      password_hash: await hasher.hash(PASSWORD),
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
      role_id: role.id,
      scope: { kind: 'tenant', include_descendants: false },
      source: 'manual',
      source_ref: null,
      period: { start: now, end: null },
      granted_by: systemActor('seed'),
      approved_by: null,
      reason: 'seed',
      status: 'active',
    })
    const pair = await app.get(AuthenticationService).login({
      tenantId: tenant,
      identifier: username,
      password: PASSWORD,
      client: { ip: '127.0.0.1', userAgent: 'vitest', app: 'test' },
    })
    return pair.accessToken
  }

  /**
   * Creates an organization through the API as the writer.
   *
   * @param code - Organization code.
   * @returns The created organization.
   */
  async function createOrganization(
    code: string,
  ): Promise<Record<string, any>> {
    const reply = await call('POST', '/v1/organizations', writerToken, {
      code,
      legalName: `PT ${code}`,
      country: 'ID',
      currency: 'IDR',
    })
    expect(reply.status).toBe(201)
    return reply.body as Record<string, any>
  }

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
      OrganizationEntity,
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
      .overrideProvider(REPOSITORY_ORGANIZATION)
      .useValue(organizations)
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
        writerToken = await seedAndLogin(tenantId, 'writer', [
          PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
          PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
        ])
        readerToken = await seedAndLogin(tenantId, 'reader', [
          PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
        ])
        otherTenantToken = await seedAndLogin(otherTenantId, 'other-writer', [
          PERMISSIONS.WORKFORCE_ORGANIZATION_READ,
          PERMISSIONS.WORKFORCE_ORGANIZATION_WRITE,
        ])
      },
    )
  })

  afterAll(async () => {
    await app.close()
  })

  it('answers the health check without a token', async () => {
    const reply = await call('GET', '/v1/health')

    expect(reply.status).toBe(200)
    expect(reply.body).toEqual({ status: 'ok' })
  })

  it('refuses every route without a token (401) and without the permission (403)', async () => {
    expect((await call('GET', '/v1/organizations')).status).toBe(401)
    expect(
      (await call('POST', '/v1/organizations', undefined, {})).status,
    ).toBe(401)
    expect(
      (
        await call('POST', '/v1/organizations', readerToken, {
          code: 'denied',
          legalName: 'X',
          country: 'ID',
          currency: 'IDR',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await call(
          'PATCH',
          `/v1/organizations/${new Types.ObjectId().toHexString()}`,
          readerToken,
          { status: 'inactive' },
        )
      ).status,
    ).toBe(403)
  })

  it('creates, reads, lists and edits an organization', async () => {
    const created = await createOrganization('rs-sehat')
    expect(created).toMatchObject({
      code: 'rs-sehat',
      legal_name: 'PT rs-sehat',
      country: 'ID',
      currency: 'IDR',
      status: 'active',
      identifiers: [],
    })
    expect(created).not.toHaveProperty('_id')
    expect(created).not.toHaveProperty('__v')

    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ id: created.id, code: 'rs-sehat' })

    const list = await call('GET', '/v1/organizations?limit=100', readerToken)
    expect(list.status).toBe(200)
    expect(
      list.body?.data.map((item: { code: string }) => item.code),
    ).toContain('rs-sehat')

    const edited = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        legalName: 'PT Rumah Sakit Sehat Tbk',
        identifiers: [
          { system: 'id.npwp-badan', value: '01.234.567.8-901.000' },
        ],
        reason: 'Name change',
      },
    )
    expect(edited.status).toBe(200)
    expect(edited.body).toMatchObject({
      legal_name: 'PT Rumah Sakit Sehat Tbk',
      code: 'rs-sehat',
      identifiers: [{ system: 'id.npwp-badan', value: '01.234.567.8-901.000' }],
    })
  })

  it("answers 404 for a malformed id, a missing id and another tenant's organization", async () => {
    const created = await createOrganization('tenant-one-org')

    expect(
      (await call('GET', '/v1/organizations/not-an-id', readerToken)).status,
    ).toBe(404)
    expect(
      (
        await call(
          'GET',
          `/v1/organizations/${new Types.ObjectId().toHexString()}`,
          readerToken,
        )
      ).status,
    ).toBe(404)
    const foreign = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      otherTenantToken,
    )
    expect(foreign.status).toBe(404)
    expect(foreign.body).toMatchObject({ code: 'organization_not_found' })
    expect(
      (
        await call(
          'PATCH',
          `/v1/organizations/${created.id}`,
          otherTenantToken,
          { status: 'inactive' },
        )
      ).status,
    ).toBe(404)
    const mine = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(mine.body).toMatchObject({ status: 'active' })
  })

  it("lists only the signed-in tenant's organizations", async () => {
    await createOrganization('only-mine')
    const foreignReply = await call(
      'POST',
      '/v1/organizations',
      otherTenantToken,
      {
        code: 'only-theirs',
        legalName: 'PT Theirs',
        country: 'SG',
        currency: 'SGD',
      },
    )
    expect(foreignReply.status).toBe(201)

    const mine = await call('GET', '/v1/organizations?limit=100', readerToken)
    const theirs = await call(
      'GET',
      '/v1/organizations?limit=100',
      otherTenantToken,
    )

    const mineCodes = mine.body?.data.map((item: { code: string }) => item.code)
    const theirCodes = theirs.body?.data.map(
      (item: { code: string }) => item.code,
    )
    expect(mineCodes).toContain('only-mine')
    expect(mineCodes).not.toContain('only-theirs')
    expect(theirCodes).toEqual(['only-theirs'])
  })

  it('answers 409 for a duplicate code, and allows the same code in another tenant', async () => {
    await createOrganization('shared-code')

    const duplicate = await call('POST', '/v1/organizations', writerToken, {
      code: 'shared-code',
      legalName: 'Again',
      country: 'ID',
      currency: 'IDR',
    })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body).toMatchObject({ code: 'organization_exists' })

    const otherTenant = await call(
      'POST',
      '/v1/organizations',
      otherTenantToken,
      {
        code: 'shared-code',
        legalName: 'Same code elsewhere',
        country: 'ID',
        currency: 'IDR',
      },
    )
    expect(otherTenant.status).toBe(201)
  })

  it('answers 409 stale_version for an edit based on an old version', async () => {
    const created = await createOrganization('versioned')
    await call('PATCH', `/v1/organizations/${created.id}`, writerToken, {
      legalName: 'Second',
    })

    const stale = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        legalName: 'Third',
        version: created.version,
      },
    )

    expect(stale.status).toBe(409)
    expect(stale.body).toMatchObject({ code: 'stale_version' })
    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.body?.legal_name).toBe('Second')
  })

  it.each([
    ['unknown country', { country: 'XX' }, 422, 'invalid_country'],
    ['unknown currency', { currency: 'ABC' }, 422, 'invalid_currency'],
    ['code with capitals', { code: 'RS-Sehat' }, 422, 'invalid_code'],
    ['lower-case country', { country: 'id' }, 400, undefined],
    ['missing legal name', { legalName: '' }, 400, undefined],
    [
      '21 identifiers',
      {
        identifiers: Array.from({ length: 21 }, (_, i) => ({
          system: `s${i}`,
          value: 'v',
        })),
      },
      400,
      undefined,
    ],
  ])('rejects a create with %s', async (_name, override, status, code) => {
    const reply = await call('POST', '/v1/organizations', writerToken, {
      code: 'bad-input',
      legalName: 'PT Bad',
      country: 'ID',
      currency: 'IDR',
      ...override,
    })

    expect(reply.status).toBe(status)
    if (code) {
      expect(reply.body).toMatchObject({ code })
    }
  })

  it('rejects an empty edit and ignores code and country in an edit body', async () => {
    const created = await createOrganization('immutable')

    const empty = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {},
    )
    expect(empty.status).toBe(422)
    expect(empty.body).toMatchObject({ code: 'empty_update' })

    const onlyImmutable = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      {
        code: 'changed',
        country: 'SG',
      },
    )
    expect(onlyImmutable.status).toBe(422)
    const read = await call(
      'GET',
      `/v1/organizations/${created.id}`,
      readerToken,
    )
    expect(read.body).toMatchObject({ code: 'immutable', country: 'ID' })
  })

  it.each(['limit=0', 'limit=101', 'limit=-1', 'offset=-1', 'status=archived'])(
    'rejects the list query %s instead of clamping it',
    async (query) => {
      expect(
        (await call('GET', `/v1/organizations?${query}`, readerToken)).status,
      ).toBe(400)
    },
  )

  it('keeps an inactive organization listed and readable', async () => {
    const created = await createOrganization('goes-inactive')
    const edited = await call(
      'PATCH',
      `/v1/organizations/${created.id}`,
      writerToken,
      { status: 'inactive' },
    )
    expect(edited.status).toBe(200)

    const listed = await call(
      'GET',
      '/v1/organizations?status=inactive&limit=100',
      readerToken,
    )
    expect(
      listed.body?.data.map((item: { code: string }) => item.code),
    ).toContain('goes-inactive')
    expect(
      (await call('GET', `/v1/organizations/${created.id}`, readerToken)).body,
    ).toMatchObject({
      status: 'inactive',
    })
  })

  it('writes no log entry when data is only read, except the access log of the request', async () => {
    const created = await createOrganization('read-only-check')
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
      const replies = [
        await call('GET', '/v1/organizations?limit=10', readerToken),
        await call('GET', `/v1/organizations/${created.id}`, readerToken),
        await call('GET', '/v1/organizations/missing-id', readerToken),
      ]
      expect(replies.map((reply) => reply.status)).toEqual([200, 200, 404])
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

  it("logs one entry per write, without the organization's values", async () => {
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
      await call('POST', '/v1/organizations', writerToken, {
        code: 'log-check',
        legalName: 'PT Secret Name',
        country: 'ID',
        currency: 'IDR',
        identifiers: [
          { system: 'id.npwp-badan', value: '99.999.999.9-999.999' },
        ],
      })
      await vi.waitFor(() =>
        expect(written.some((entry) => entry.event === 'http_request')).toBe(
          true,
        ),
      )

      const writes = written.filter(
        (entry) => entry.event === 'organization_create',
      )
      expect(writes).toHaveLength(1)
      expect(writes[0]).toMatchObject({
        outcome: 'success',
        operation: 'OrganizationService.create',
      })
      expect(JSON.stringify(written)).not.toContain('Secret Name')
      expect(JSON.stringify(written)).not.toContain('99.999')
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
  })
})
