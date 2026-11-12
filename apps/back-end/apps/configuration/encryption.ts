import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * Length in bytes of both secrets: AES-256 and HMAC-SHA256 keys.
 */
const KEY_BYTES = 32

/**
 * Joi rule for a secret written as base64 that decodes to exactly 32 bytes.
 */
const secret = Joi.string()
  .required()
  .custom((value: string, helpers) => {
    const bytes = Buffer.from(value, 'base64')
    // Buffer.from ignores characters outside the alphabet, so compare the round trip.
    return bytes.length === KEY_BYTES &&
      bytes.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')
      ? value
      : helpers.message({
          custom: `must be base64 text that decodes to ${KEY_BYTES} bytes (openssl rand -base64 32)`,
        })
  }, 'base64 secret of 32 bytes')

/**
 * Validates the variables of `encryption.env`. Both secrets are required and have no default, so an
 * application that stores encrypted fields refuses to start without them.
 *
 * - `ENCRYPTION_MASTER_KEY`: root of the per-tenant data keys. Replaced when keys are rotated.
 * - `ENCRYPTION_HASH_KEY`: root of the per-tenant lookup-hash keys. Must never change, because
 *   stored hashes are compared with new ones.
 */
export const EncryptionSchema = Joi.object({
  ENCRYPTION_MASTER_KEY: secret,
  ENCRYPTION_HASH_KEY: secret,
})

/**
 * Typed encryption configuration, available under the `encryption` namespace. The values are
 * validated by `EncryptionSchema` before this factory runs. Never log it.
 */
export const EncryptionConfig = registerAs('encryption', () => ({
  masterKey: Buffer.from(process.env.ENCRYPTION_MASTER_KEY ?? '', 'base64'),
  hashKey: Buffer.from(process.env.ENCRYPTION_HASH_KEY ?? '', 'base64'),
}))
