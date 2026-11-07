import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { Types } from 'mongoose'
import { ChangeLogConfig } from '@configuration/change-log'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryValidationError,
} from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { runWithRequestContext } from '@utility/logger/context'
import { type AccountCredentialRepository } from '@repository/interface/account-credential'
import { type AccountRepository } from '@repository/interface/account'
import { type SecurityEventRepository } from '@repository/interface/security-event'
import {
  REPOSITORY_ACCOUNT,
  REPOSITORY_ACCOUNT_CREDENTIAL,
  REPOSITORY_SECURITY_EVENT,
} from '@repository/token'
import { AccountRepositoryModule } from './account.module'
import { AccountCredentialRepositoryModule } from './account-credential.module'
import { SecurityEventRepositoryModule } from './security-event.module'
import { AccountEntity } from './schema/account'
import { AccountCredentialEntity } from './schema/account-credential'
import { SecurityEventEntity } from './schema/security-event'

/**
 * Records appended to the fake outbox.
 */
const appended: ChangeRecord[] = []

/**
 * Stand-in for the global connection module: outbox, transactions and configuration.
 */
@Global()
@Module({
  providers: [
    {
      provide: CHANGE_OUTBOX,
      useValue: {
        append: async (record: ChangeRecord) => void appended.push(record),
      },
    },
    {
      provide: TRANSACTION_MANAGER,
      useValue: { run: (work: () => Promise<unknown>) => work() },
    },
    { provide: ChangeLogConfig.KEY, useValue: { recordMaxBytes: 200_000 } },
  ],
  exports: [CHANGE_OUTBOX, TRANSACTION_MANAGER, ChangeLogConfig.KEY],
})
class FakeConnectionModule {}

/**
 * Wraps a value as a Mongoose query (`.lean().exec()` and `.exec()`).
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function query(value: unknown) {
  return { lean: () => ({ exec: async () => value }), exec: async () => value }
}

/**
 * Runs `work` as a signed-in request.
 *
 * @param work - Code to run.
 * @returns What `work` returns.
 */
function asAdmin<T>(work: () => Promise<T>): Promise<T> {
  return runWithRequestContext(
    {
      correlationId: 'c1',
      actor: { account_id: 'a1', display_name: 'Admin', kind: 'account' },
    },
    work,
  )
}

/**
 * Casts identifier strings to ObjectIds the way Mongoose does for ObjectId paths.
 *
 * @param document - Document being created.
 * @returns The document with ObjectId values for fields ending in `_id`.
 */
function castIds(document: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [
      key,
      key.endsWith('_id') && typeof value === 'string'
        ? new Types.ObjectId(value)
        : value,
    ]),
  )
}

const tenantId = new Types.ObjectId()
const accountId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const storedAccount = {
  _id: accountId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 3,
  account_type: 'workforce',
  employee_id: new Types.ObjectId(),
  sponsor_account_id: null,
  username: 'siti.rahma',
  login_identifiers: [
    {
      type: 'username',
      value: 'siti.rahma',
      normalized: 'siti.rahma',
      is_primary: true,
      verified_at: null,
      _id: new Types.ObjectId(),
    },
  ],
  profile: { display_name: 'Siti Rahma' },
  profile_source: 'hr',
  preferences: { locale: 'id-ID', timezone: null, default_facility_id: null },
  status: 'active',
  status_changed_at: new Date('2026-01-01T00:00:00Z'),
  is_open: true,
  holds: [],
  validity: { not_before: null, expires_at: null },
  mfa_required: false,
  authz_version: 1,
  last_login_at: null,
  request_id: null,
  closed: null,
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}
const storedCredential = {
  _id: new Types.ObjectId(),
  tenant_id: tenantId,
  schema_version: 1,
  version: 0,
  account_id: accountId,
  password_hash: '$argon2id$SECRET-HASH-VALUE',
  password_history: ['$argon2id$OLD-SECRET-HASH'],
  password_changed_at: new Date('2026-01-01T00:00:00Z'),
  must_change: false,
  failed_attempts: 0,
  last_failed_at: null,
  locked_until: null,
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

describe('identity repositories on the shared Mongo base', () => {
  const accountModel = {
    findOne: vi.fn(() => query(storedAccount)),
    findOneAndUpdate: vi.fn(() => query({ ...storedAccount, version: 4 })),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...storedAccount, ...castIds(document) }),
      })),
    ),
  }
  const credentialModel = {
    findOne: vi.fn(() => query(storedCredential)),
    findOneAndUpdate: vi.fn(() => query(storedCredential)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...storedCredential, ...castIds(document) }),
      })),
    ),
  }
  const eventModel = { create: vi.fn() }
  let accounts: AccountRepository
  let credentials: AccountCredentialRepository
  let events: SecurityEventRepository

  beforeEach(async () => {
    appended.length = 0
    vi.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      imports: [
        FakeConnectionModule,
        AccountRepositoryModule,
        AccountCredentialRepositoryModule,
        SecurityEventRepositoryModule,
      ],
    })
      .overrideProvider(
        getModelToken(AccountEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(accountModel)
      .overrideProvider(
        getModelToken(AccountCredentialEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(credentialModel)
      .overrideProvider(
        getModelToken(SecurityEventEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(eventModel)
      .compile()
    accounts = moduleRef.get(REPOSITORY_ACCOUNT)
    credentials = moduleRef.get(REPOSITORY_ACCOUNT_CREDENTIAL)
    events = moduleRef.get(REPOSITORY_SECURITY_EVENT)
  })

  it('maps stored accounts to the model without storage fields', async () => {
    const account = await accounts.findOne(accountId.toHexString())
    expect(account).toMatchObject({
      id: accountId.toHexString(),
      tenant_id: tenantId.toHexString(),
      version: 3,
    })
    expect(JSON.stringify(account)).not.toContain('"_id"')
    expect(account?.login_identifiers[0]).not.toHaveProperty('_id')
  })

  it('stamps new records with the acting account and refuses to write without one', async () => {
    const input = {
      tenant_id: tenantId.toHexString(),
      account_id: accountId.toHexString(),
      password_hash: '$argon2id$SECRET-HASH-VALUE',
      password_history: [],
      password_changed_at: new Date(),
      must_change: true,
      failed_attempts: 0,
      last_failed_at: null,
      locked_until: null,
    }
    await expect(credentials.create(input)).rejects.toBeInstanceOf(
      RepositoryError,
    )
    expect(credentialModel.create).not.toHaveBeenCalled()

    await asAdmin(() => credentials.create(input))
    expect(credentialModel.create).toHaveBeenCalledWith([
      expect.objectContaining({ created_by: actor, schema_version: 1 }),
    ])
  })

  it('never writes password hashes to the change history', async () => {
    await asAdmin(() =>
      credentials.create({
        tenant_id: tenantId.toHexString(),
        account_id: accountId.toHexString(),
        password_hash: '$argon2id$SECRET-HASH-VALUE',
        password_history: ['$argon2id$OLD-SECRET-HASH'],
        password_changed_at: new Date(),
        must_change: true,
        failed_attempts: 0,
        last_failed_at: null,
        locked_until: null,
      }),
    )
    expect(appended).toHaveLength(1)
    const serialized = JSON.stringify(appended)
    expect(serialized).not.toContain('SECRET-HASH-VALUE')
    expect(serialized).not.toContain('OLD-SECRET-HASH')
    expect(appended[0].changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'password_hash', class: 'secret' }),
        expect.objectContaining({ path: 'password_history', class: 'secret' }),
      ]),
    )
  })

  it('masks login identifiers in the change history', async () => {
    await asAdmin(() =>
      accounts.update(accountId.toHexString(), {
        username: 'siti.new',
        login_identifiers: [
          {
            type: 'username',
            value: 'siti.new',
            normalized: 'siti.new',
            is_primary: true,
            verified_at: null,
          },
        ],
      }),
    )
    const serialized = JSON.stringify(appended)
    expect(serialized).not.toContain('siti.new')
    expect(serialized).not.toContain('siti.rahma')
  })

  it('checks the expected version and bumps it on update', async () => {
    await asAdmin(() =>
      accounts.update(
        accountId.toHexString(),
        { mfa_required: true },
        { expectedVersion: 3 },
      ),
    )
    const [filter, update] = accountModel.findOneAndUpdate.mock
      .calls[0] as unknown as [Record<string, unknown>, Record<string, unknown>]
    expect(filter).toMatchObject({ version: 3 })
    expect(update).toMatchObject({ $inc: { version: 1 } })
  })

  it('rejects a stale version with a conflict', async () => {
    accountModel.findOneAndUpdate.mockReturnValueOnce(query(null))
    await expect(
      asAdmin(() =>
        accounts.update(
          accountId.toHexString(),
          { mfa_required: true },
          { expectedVersion: 2 },
        ),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('ignores fields that are fixed after creation', async () => {
    await asAdmin(() =>
      accounts.update(accountId.toHexString(), {
        mfa_required: true,
        // Not updatable: a caller must not be able to move an account to another tenant.
        ...({ tenant_id: new Types.ObjectId().toHexString() } as object),
      }),
    )
    const [, update] = accountModel.findOneAndUpdate.mock
      .calls[0] as unknown as [unknown, { $set: Record<string, unknown> }]
    expect(Object.keys(update.$set).sort()).toEqual([
      'mfa_required',
      'updated_at',
    ])
  })

  it('does not support deleting accounts or changing security events', async () => {
    await expect(
      accounts.delete(accountId.toHexString()),
    ).rejects.toBeInstanceOf(RepositoryValidationError)
    await expect(
      accounts.deleteSoft(accountId.toHexString()),
    ).rejects.toBeInstanceOf(RepositoryValidationError)
    await expect(events.update('x', {})).rejects.toBeInstanceOf(
      RepositoryValidationError,
    )
    await expect(events.delete('x')).rejects.toBeInstanceOf(
      RepositoryValidationError,
    )
  })

  it('counts a failed login with one atomic pipeline update', async () => {
    const now = new Date('2026-02-01T00:00:00Z')
    await asAdmin(() =>
      credentials.registerFailedAttempt(
        accountId.toHexString(),
        { maxAttempts: 5, lockoutMs: 900_000 },
        now,
      ),
    )
    const [, pipeline, options] = credentialModel.findOneAndUpdate.mock
      .calls[0] as unknown as [unknown, unknown[], Record<string, unknown>]
    expect(Array.isArray(pipeline)).toBe(true)
    expect(options).toMatchObject({
      updatePipeline: true,
      returnDocument: 'after',
    })
    expect(JSON.stringify(pipeline)).toContain('$add')
  })
})
