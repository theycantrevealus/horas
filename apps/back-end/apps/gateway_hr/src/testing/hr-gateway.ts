import {
  Global,
  Module,
  ValidationPipe,
  VersioningType,
  type Type,
} from '@nestjs/common'
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
import { EncryptionConfig } from '@configuration/encryption'
import { LoggerConfig } from '@configuration/logger'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { RepositoryExceptionFilter } from '@utility/filter/repository'
import { systemActor } from '@utility/history/actor'
import { EVENT_OUTBOX } from '@utility/events/event'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { InMemoryEventOutbox } from '@utility/testing/in-memory-event-outbox'
import { runWithRequestContext } from '@utility/logger/context'
import { RequestLoggingInterceptor } from '@utility/logger/interceptor'
import { LoggerModule } from '@utility/logger/module'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_ACCOUNT_ROLE_BINDING,
  REPOSITORY_ACCOUNT_SESSION,
  REPOSITORY_ROLE,
  REPOSITORY_SECURITY_EVENT,
} from '@repository/token'
import { AccountEntity } from '@repository/mongo/schema/account'
import { AccountCredentialEntity } from '@repository/mongo/schema/account-credential'
import { AccountRoleBindingEntity } from '@repository/mongo/schema/account-role-binding'
import { AccountSessionEntity } from '@repository/mongo/schema/account-session'
import { RoleEntity } from '@repository/mongo/schema/role'
import { SecurityEventEntity } from '@repository/mongo/schema/security-event'
import { AuthenticationService } from '@identity/authentication/authentication.service'
import { PasswordHasher } from '@identity/authentication/password-hasher'
import { AuthenticationGuard } from '@identity/guard/authentication.guard'
import { PermissionsGuard } from '@identity/guard/permissions.guard'
import { IdentityExceptionFilter } from '@identity/identity.filter'
import { IdentityModule } from '@identity/identity.module'
import {
  InMemoryAccounts,
  InMemoryBindings,
  InMemoryCredentials,
  InMemoryRoles,
  InMemorySecurityEvents,
  InMemorySessions,
} from '@identity/testing/in-memory'
import { WorkforceExceptionFilter } from '@workforce/workforce.filter'
import { GatewayHrController } from '../gateway.hr.controller'

/**
 * Password of every account the harness seeds.
 */
const PASSWORD = 'Correct-Horse-Battery-9'

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
    { provide: EVENT_OUTBOX, useValue: { append: async () => undefined } },
    { provide: ChangeLogConfig.KEY, useValue: { recordMaxBytes: 200_000 } },
  ],
  exports: [
    TRANSACTION_MANAGER,
    CHANGE_OUTBOX,
    EVENT_OUTBOX,
    ChangeLogConfig.KEY,
  ],
})
class FakeConnectionModule {}

/**
 * Parsed answer of a test request.
 *
 * @property status - HTTP status.
 * @property body - Parsed JSON body, or `null` when the answer is not JSON.
 * @property headers - Response headers, lower-cased.
 */
export interface Reply {
  status: number
  body: Record<string, any> | null
  headers: Record<string, string | string[] | number | undefined>
}

/**
 * What a gateway test needs besides the area it tests.
 *
 * @property modules - HTTP modules of the area under test, for example `FacilityManagementModule`.
 * @property entities - Mongoose entity classes whose model tokens are stubbed out, so no Mongo is needed.
 * @property repositories - Repository tokens mapped to in-memory fakes.
 */
export interface HrGatewayOptions {
  modules: Type<unknown>[]
  entities: { name: string }[]
  repositories: [symbol, unknown][]
}

/**
 * The HR gateway running in memory, with helpers to sign in and call it.
 *
 * @property app - The Nest application.
 * @property tenantId - A tenant for the tests.
 * @property otherTenantId - A second tenant, for isolation tests.
 * @property call - Sends a request and parses the answer.
 * @property seedAndLogin - Seeds an account with a role holding the permissions and signs it in.
 * @property changeRecords - Every change record the application wrote to the outbox, in order.
 * @property eventOutbox - The event outbox; its `events` hold every event the application wrote.
 * @property close - Stops the application.
 */
export interface HrGateway {
  app: NestFastifyApplication
  tenantId: string
  otherTenantId: string
  changeRecords: ChangeRecord[]
  eventOutbox: InMemoryEventOutbox
  call: (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    url: string,
    token?: string,
    payload?: object,
  ) => Promise<Reply>
  seedAndLogin: (
    tenant: string,
    username: string,
    permissions: readonly string[],
    employeeId?: string | null,
  ) => Promise<string>
  close: () => Promise<void>
}

/**
 * Starts the HR gateway without Mongo: the same filters, guards and interceptor as
 * `GatewayHrModule`, in-memory identity repositories and the fakes the test passes in.
 *
 * @param options - Area modules, stubbed entities and fake repositories.
 * @returns The running gateway and its helpers.
 */
export async function createHrGateway(
  options: HrGatewayOptions,
): Promise<HrGateway> {
  process.env.AUTH_JWT_SECRET =
    'test-secret-that-is-long-enough-for-hs256-0123456789'
  process.env.ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 'master-a').toString(
    'base64',
  )
  process.env.ENCRYPTION_HASH_KEY = Buffer.alloc(32, 'hash-a').toString(
    'base64',
  )
  process.env.LOG_LEVEL = 'error'
  process.env.LOG_FORMAT = 'json'

  const accounts = new InMemoryAccounts()
  const credentials = new InMemoryCredentials()
  const sessions = new InMemorySessions()
  const events = new InMemorySecurityEvents()
  const roles = new InMemoryRoles()
  const bindings = new InMemoryBindings()
  const changeRecords: ChangeRecord[] = []
  const eventOutbox = new InMemoryEventOutbox()
  const tenantId = new Types.ObjectId().toHexString()
  const otherTenantId = new Types.ObjectId().toHexString()

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [AuthConfig, LoggerConfig, ChangeLogConfig, EncryptionConfig],
      }),
      FakeConnectionModule,
      LoggerModule,
      IdentityModule,
      ...options.modules,
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

  const builder = Test.createTestingModule({ imports: [TestRootModule] })
  for (const entity of [
    AccountEntity,
    AccountCredentialEntity,
    AccountSessionEntity,
    SecurityEventEntity,
    RoleEntity,
    AccountRoleBindingEntity,
    ...options.entities,
  ]) {
    builder
      .overrideProvider(getModelToken(entity.name, MONGO_MAIN_CONNECTION))
      .useValue({})
  }
  const overrides: [symbol, unknown][] = [
    [EVENT_OUTBOX, eventOutbox],
    [
      CHANGE_OUTBOX,
      {
        append: async (record: ChangeRecord) => void changeRecords.push(record),
      },
    ],
    [REPOSITORY_ACCOUNT, accounts],
    [REPOSITORY_ACCOUNT_CREDENTIAL, credentials],
    [REPOSITORY_ACCOUNT_SESSION, sessions],
    [REPOSITORY_SECURITY_EVENT, events],
    [REPOSITORY_ROLE, roles],
    [REPOSITORY_ACCOUNT_ROLE_BINDING, bindings],
    ...options.repositories,
  ]
  for (const [token, value] of overrides) {
    builder.overrideProvider(token).useValue(value)
  }
  const moduleRef = await builder.compile()
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  )
  app.useLogger(false)
  app.enableVersioning({ type: VersioningType.URI })
  // Same pipe as main.ts.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.init()
  await app.getHttpAdapter().getInstance().ready()
  const hasher = app.get(PasswordHasher)

  /**
   * Seeds an active account with a role holding the given permissions, and signs it in.
   *
   * @param tenant - Tenant of the account.
   * @param username - Login name.
   * @param permissions - Permissions of its role.
   * @param employeeId - Employee the account is linked to; a new identifier by default, `null`
   * for an account without an employee.
   * @returns The access token.
   */
  async function seedAndLogin(
    tenant: string,
    username: string,
    permissions: readonly string[],
    employeeId: string | null = new Types.ObjectId().toHexString(),
  ): Promise<string> {
    return runWithRequestContext(
      { correlationId: 'seed', actor: systemActor('seed') },
      async () => {
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
          employee_id: employeeId,
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
          preferences: {
            locale: 'en',
            timezone: null,
            default_facility_id: null,
          },
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
      },
    )
  }

  return {
    app,
    tenantId,
    otherTenantId,
    seedAndLogin,
    changeRecords,
    eventOutbox,
    close: () => app.close(),
    async call(method, url, token, payload) {
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
    },
  }
}
