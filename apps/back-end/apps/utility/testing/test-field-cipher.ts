import { type ConfigType } from '@nestjs/config'
import { type EncryptionConfig } from '@configuration/encryption'
import { AesGcmFieldCipher } from '@utility/encryption/aes-gcm-field-cipher'

/**
 * Builds a real field cipher with fixed keys, for tests that must exercise the actual encryption,
 * hashing and masking. The keys are public test values and protect nothing.
 *
 * @param seed - Changes both keys, to build a second cipher with other keys.
 * @returns The cipher.
 */
export function createTestFieldCipher(seed = 'a'): AesGcmFieldCipher {
  const config: ConfigType<typeof EncryptionConfig> = {
    masterKey: Buffer.alloc(32, `master-${seed}`),
    hashKey: Buffer.alloc(32, `hash-${seed}`),
  }
  return new AesGcmFieldCipher(config)
}
