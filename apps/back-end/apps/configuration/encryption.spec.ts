import { randomBytes } from 'node:crypto'
import { EncryptionSchema } from './encryption'
import { ConfigSchema, EncryptedConfigSchema } from './index'

describe('EncryptionSchema', () => {
  const key = () => randomBytes(32).toString('base64')

  it('accepts two base64 secrets of 32 bytes', () => {
    const { error } = EncryptionSchema.validate({
      ENCRYPTION_MASTER_KEY: key(),
      ENCRYPTION_HASH_KEY: key(),
    })

    expect(error).toBeUndefined()
  })

  it('refuses a missing secret', () => {
    expect(
      EncryptionSchema.validate({ ENCRYPTION_MASTER_KEY: key() }).error,
    ).toBeDefined()
    expect(
      EncryptionSchema.validate({ ENCRYPTION_HASH_KEY: key() }).error,
    ).toBeDefined()
  })

  it.each([
    ['too short', randomBytes(16).toString('base64')],
    ['too long', randomBytes(48).toString('base64')],
    ['not base64', '!!!not base64 at all!!!!!!!!!!!!!!!!!!!!!!!'],
    ['empty', ''],
  ])('refuses a secret that is %s', (_label, bad) => {
    const { error } = EncryptionSchema.validate({
      ENCRYPTION_MASTER_KEY: bad,
      ENCRYPTION_HASH_KEY: key(),
    })

    expect(error).toBeDefined()
  })
})

describe('EncryptedConfigSchema', () => {
  const base = {
    NODE_PORT: '3001',
    APP_NAME: 'horas',
    APP_DB: 'horas',
    MONGO_URL: 'mongodb://localhost:27017',
    MONGO_USER: 'u',
    MONGO_PASSWORD: 'p',
    MONGO_DB_NAME: 'horas',
    AUTH_JWT_SECRET: 'x'.repeat(40),
    CHANGE_LOG_STDOUT: 'true',
  }

  it('needs the encryption secrets, while the common schema of the other applications does not', () => {
    const withoutKeys = ConfigSchema.validate(base, { allowUnknown: true })
    const encryptedWithout = EncryptedConfigSchema.validate(base, {
      allowUnknown: true,
    })
    const encryptedWith = EncryptedConfigSchema.validate(
      {
        ...base,
        ENCRYPTION_MASTER_KEY: randomBytes(32).toString('base64'),
        ENCRYPTION_HASH_KEY: randomBytes(32).toString('base64'),
      },
      { allowUnknown: true },
    )

    expect(withoutKeys.error?.message ?? '').not.toContain('ENCRYPTION')
    expect(encryptedWithout.error?.message).toContain('ENCRYPTION_MASTER_KEY')
    expect(encryptedWith.error?.message ?? '').not.toContain('ENCRYPTION')
  })
})
