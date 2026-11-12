import { Global, Module } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { mongo, Types } from 'mongoose'
import { ChangeLogConfig } from '@configuration/change-log'
import { MONGO_MAIN_CONNECTION } from '@utility/database/constant'
import {
  RepositoryConflictError,
  RepositoryError,
} from '@utility/database/error'
import { TRANSACTION_MANAGER } from '@utility/database/transaction'
import { CHANGE_OUTBOX } from '@utility/history/outbox'
import { type ChangeRecord } from '@utility/history/record'
import { FIELD_CIPHER } from '@utility/encryption/field-cipher'
import { runWithRequestContext } from '@utility/logger/context'
import { createTestFieldCipher } from '@utility/testing/test-field-cipher'
import { type EmployeePrivateProfileRepository } from '@repository/interface/employee-private-profile'
import { REPOSITORY_EMPLOYEE_PRIVATE_PROFILE } from '@repository/token'
import { EmployeePrivateProfileRepositoryModule } from './employee-private-profile.module'
import { EmployeePrivateProfileEntity } from './schema/employee-private-profile'

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

/**
 * Wraps a value as a chainable Mongoose query (`.sort().limit().lean().exec()`).
 *
 * @param value - Query result.
 * @returns The fake query.
 */
function chain(value: unknown) {
  const self = {
    sort: () => self,
    skip: () => self,
    limit: () => self,
    lean: () => self,
    exec: async () => value,
  }
  return self
}

const tenantId = new Types.ObjectId()
const employeeId = new Types.ObjectId()
const profileId = new Types.ObjectId()
const actor = { account_id: 'a1', display_name: 'Admin', kind: 'account' }
const cipher = createTestFieldCipher()
const tenant = tenantId.toHexString()

const NIK = '3174011234567890'
const ACCOUNT = '1234567890123'
const BIRTH_DATE = '1990-05-17'

/**
 * A stored profile as the repository writes it: ciphertext, hash and masked value.
 */
const stored = {
  _id: profileId,
  tenant_id: tenantId,
  schema_version: 1,
  version: 3,
  employee_id: employeeId,
  birth_date_encrypted: cipher.encrypt(tenant, 'birth_date', BIRTH_DATE),
  birth_place: 'Bandung',
  nationalities: ['ID'],
  identifiers: [
    {
      type: { system: 'id.identifier-type', code: 'national_id' },
      system: 'id.nik',
      issuing_country: 'ID',
      value_encrypted: cipher.encrypt(tenant, 'identifier_value', NIK),
      value_hash: cipher.hash(tenant, NIK),
      value_masked: '************7890',
      period: null,
      verified_at: null,
    },
  ],
  personal_contacts: [],
  addresses: [],
  marital_status: { system: 'id.marital-status', code: 'married' },
  religion: null,
  family_members: [],
  emergency_contacts: [],
  bank_accounts: [
    {
      bank: { system: 'id.bank', code: 'bca' },
      account_name: 'Siti',
      account_number_encrypted: cipher.encrypt(
        tenant,
        'bank_account_number',
        ACCOUNT,
      ),
      account_number_masked: '*********0123',
      swift_bic: null,
      currency: 'IDR',
      is_primary: true,
    },
  ],
  tax_profile: [],
  created_by: actor,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
}

const fields = {
  birth_date: '1991-02-03',
  birth_place: 'Jakarta',
  nationalities: ['ID'],
  personal_contacts: [],
  addresses: [],
  marital_status: null,
  religion: null,
  family_members: [],
  emergency_contacts: [],
  tax_profile: [],
}

describe('EmployeePrivateProfileRepository on the shared Mongo base', () => {
  const model = {
    findOne: vi.fn((..._args: unknown[]) => chain(stored)),
    findOneAndUpdate: vi.fn((..._args: unknown[]) => chain(stored)),
    create: vi.fn(async (documents: Record<string, unknown>[]) =>
      documents.map((document) => ({
        toObject: () => ({ ...stored, ...castIds(document), _id: profileId }),
      })),
    ),
  }
  let profiles: EmployeePrivateProfileRepository

  beforeEach(async () => {
    appended.length = 0
    vi.resetAllMocks()
    model.findOne.mockImplementation(() => chain(stored))
    model.findOneAndUpdate.mockImplementation(() => chain(stored))
    model.create.mockImplementation(
      async (documents: Record<string, unknown>[]) =>
        documents.map((document) => ({
          toObject: () => ({
            ...stored,
            ...castIds(document),
            _id: profileId,
          }),
        })),
    )
    const moduleRef = await Test.createTestingModule({
      imports: [FakeConnectionModule, EmployeePrivateProfileRepositoryModule],
    })
      .overrideProvider(
        getModelToken(EmployeePrivateProfileEntity.name, MONGO_MAIN_CONNECTION),
      )
      .useValue(model)
      .overrideProvider(FIELD_CIPHER)
      .useValue(cipher)
      .compile()
    profiles = moduleRef.get(REPOSITORY_EMPLOYEE_PRIVATE_PROFILE)
  })

  it('reads the profile with the birth date decrypted and identifiers and accounts masked', async () => {
    const profile = await profiles.findByEmployee(
      tenant,
      employeeId.toHexString(),
    )

    expect(profile).toMatchObject({
      id: profileId.toHexString(),
      employee_id: employeeId.toHexString(),
      birth_date: BIRTH_DATE,
      birth_place: 'Bandung',
      identifiers: [{ system: 'id.nik', value_masked: '************7890' }],
      bank_accounts: [
        { account_number_masked: '*********0123', is_primary: true },
      ],
      marital_status: { code: 'married' },
    })
    const text = JSON.stringify(profile)
    for (const secret of [NIK, ACCOUNT, 'encrypted', '"_id"']) {
      expect(text).not.toContain(secret)
    }
  })

  it('answers null for a missing profile and for malformed ids', async () => {
    model.findOne.mockReturnValueOnce(chain(null))

    expect(
      await profiles.findByEmployee(tenant, employeeId.toHexString()),
    ).toBeNull()
    expect(
      await profiles.findByEmployee('x', employeeId.toHexString()),
    ).toBeNull()
    expect(await profiles.findByEmployee(tenant, 'x')).toBeNull()
    expect(await profiles.findIdentifierValue('x', 'y', 'id.nik')).toBeNull()
  })

  it('reveals one identifier in full with its profile, and answers null for an unknown system', async () => {
    const found = await profiles.findIdentifierValue(
      tenant,
      employeeId.toHexString(),
      'id.nik',
    )
    const none = await profiles.findIdentifierValue(
      tenant,
      employeeId.toHexString(),
      'passport',
    )

    expect(found).toEqual({ profile_id: profileId.toHexString(), value: NIK })
    expect(none).toBeNull()
  })

  it('finds the holder of an identifier by its hash, never by the plain value', async () => {
    const holder = await profiles.findEmployeeIdByIdentifier(
      tenant,
      'id.nik',
      NIK,
    )

    expect(holder).toBe(employeeId.toHexString())
    const [filter] = model.findOne.mock.calls[0] as unknown as [
      Record<string, unknown>,
    ]
    expect(JSON.stringify(filter)).toContain(cipher.hash(tenant, NIK))
    expect(JSON.stringify(filter)).not.toContain(NIK)
  })

  it('creates the profile with an encrypted birth date, and records one change entry without the plain value', async () => {
    model.findOne.mockReturnValueOnce(chain(null))

    const created = await asAdmin(() =>
      profiles.saveProfile(tenant, employeeId.toHexString(), fields),
    )

    const [[[document]]] = model.create.mock.calls as unknown as [
      [[Record<string, unknown>]],
    ]
    expect(document).toMatchObject({ created_by: actor, schema_version: 1 })
    expect(JSON.stringify(document)).not.toContain('1991-02-03')
    expect(
      cipher.decrypt(
        tenant,
        'birth_date',
        document.birth_date_encrypted as string,
      ),
    ).toBe('1991-02-03')
    expect(created.birth_date).toBe('1991-02-03')
    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      action: 'create',
      entity: { type: 'employee_private_profile' },
    })
    expect(JSON.stringify(appended)).not.toContain('1991-02-03')
  })

  it('updates the profile fields with the expected version and records the change without plain values', async () => {
    await asAdmin(() =>
      profiles.saveProfile(tenant, employeeId.toHexString(), fields, {
        expectedVersion: 3,
      }),
    )

    const [filter, update] = model.findOneAndUpdate.mock
      .calls[0] as unknown as [
      Record<string, unknown>,
      { $set: Record<string, unknown>; $inc: Record<string, number> },
    ]
    expect(filter).toMatchObject({ version: 3 })
    expect(update.$set).toHaveProperty('birth_place', 'Jakarta')
    expect(update.$set).not.toHaveProperty('identifiers')
    expect(update.$set).not.toHaveProperty('bank_accounts')
    expect(update.$inc).toEqual({ version: 1 })
    expect(JSON.stringify(update)).not.toContain('1991-02-03')
    expect(JSON.stringify(appended)).not.toContain('1991-02-03')
    expect(JSON.stringify(appended)).not.toContain(NIK)
  })

  it('stores identifiers encrypted, hashed and masked, never plain, and records only masked forms', async () => {
    model.findOne.mockReturnValueOnce(chain(null))

    await asAdmin(() =>
      profiles.replaceIdentifiers(tenant, employeeId.toHexString(), [
        {
          type: { system: 'id.identifier-type', code: 'national_id' },
          system: 'id.nik',
          issuing_country: 'ID',
          value: '3174019999999999',
          period: null,
        },
      ]),
    )

    const [[[document]]] = model.create.mock.calls as unknown as [
      [[{ identifiers: Record<string, unknown>[] }]],
    ]
    const [identifier] = document.identifiers
    expect(identifier).toMatchObject({
      system: 'id.nik',
      value_masked: '************9999',
      value_hash: cipher.hash(tenant, '3174019999999999'),
      verified_at: null,
    })
    expect(
      cipher.decrypt(
        tenant,
        'identifier_value',
        identifier.value_encrypted as string,
      ),
    ).toBe('3174019999999999')
    expect(JSON.stringify(document)).not.toContain('3174019999999999')
    expect(JSON.stringify(appended)).not.toContain('3174019999999999')
    expect(JSON.stringify(appended)).toContain('************9999')
  })

  it('stores bank accounts encrypted and masked, never plain, and keeps the identifiers it did not touch', async () => {
    await asAdmin(() =>
      profiles.replaceBankAccounts(tenant, employeeId.toHexString(), [
        {
          bank: { system: 'id.bank', code: 'mandiri' },
          account_name: 'Siti Rahma',
          account_number: '9876543210987',
          swift_bic: 'BMRIIDJA',
          currency: 'IDR',
          is_primary: true,
        },
      ]),
    )

    const [, update] = model.findOneAndUpdate.mock.calls[0] as unknown as [
      unknown,
      { $set: { bank_accounts: Record<string, unknown>[] } },
    ]
    const [account] = update.$set.bank_accounts
    expect(account).toMatchObject({
      account_number_masked: '*********0987',
      swift_bic: 'BMRIIDJA',
    })
    expect(
      cipher.decrypt(
        tenant,
        'bank_account_number',
        account.account_number_encrypted as string,
      ),
    ).toBe('9876543210987')
    expect(update.$set).not.toHaveProperty('identifiers')
    expect(JSON.stringify(update)).not.toContain('9876543210987')
    expect(JSON.stringify(appended)).not.toContain('9876543210987')
  })

  it('rejects a stale expected version, and a version for a profile that does not exist, with a conflict', async () => {
    await expect(
      asAdmin(() =>
        profiles.saveProfile(tenant, employeeId.toHexString(), fields, {
          expectedVersion: 1,
        }),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()

    model.findOne.mockReturnValueOnce(chain(null))
    await expect(
      asAdmin(() =>
        profiles.saveProfile(tenant, employeeId.toHexString(), fields, {
          expectedVersion: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
    expect(appended).toHaveLength(0)
  })

  it('translates a duplicate key into a conflict', async () => {
    model.findOne.mockReturnValueOnce(chain(null))
    model.create.mockRejectedValueOnce(
      new mongo.MongoServerError({
        message: 'E11000 duplicate key',
        code: 11000,
      }),
    )

    await expect(
      asAdmin(() =>
        profiles.saveProfile(tenant, employeeId.toHexString(), fields),
      ),
    ).rejects.toBeInstanceOf(RepositoryConflictError)
  })

  it('refuses to write without an acting account', async () => {
    await expect(
      profiles.saveProfile(tenant, employeeId.toHexString(), fields),
    ).rejects.toBeInstanceOf(RepositoryError)
    expect(model.create).not.toHaveBeenCalled()
    expect(model.findOneAndUpdate).not.toHaveBeenCalled()
  })

  it('rejects a value that cannot be decrypted with a repository error that holds no value', async () => {
    model.findOne.mockReturnValueOnce(
      chain({
        ...stored,
        birth_date_encrypted: cipher.encrypt(
          new Types.ObjectId().toHexString(),
          'birth_date',
          BIRTH_DATE,
        ),
      }),
    )

    const failure = await profiles
      .findByEmployee(tenant, employeeId.toHexString())
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(RepositoryError)
    expect(String(failure)).not.toContain(BIRTH_DATE)
    expect(String((failure as Error).message)).not.toContain('v1:')
  })

  it('does not support the generic create, update, delete or soft delete', async () => {
    await expect(
      asAdmin(() => profiles.create({} as never)),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => profiles.update(profileId.toHexString(), {})),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => profiles.delete(profileId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
    await expect(
      asAdmin(() => profiles.deleteSoft(profileId.toHexString())),
    ).rejects.toBeInstanceOf(RepositoryError)
  })
})
