import { Module } from '@nestjs/common'
import { AesGcmFieldCipher } from './aes-gcm-field-cipher'
import { FIELD_CIPHER } from './field-cipher'

/**
 * Provides the field cipher. Import it in the application's root module, next to a `ConfigModule`
 * that loads `EncryptionConfig` and validates `EncryptionSchema`, and in the repository modules that
 * store encrypted fields. Importing it again does not create a second cipher with other keys: every
 * instance reads the same configuration.
 */
@Module({
  providers: [{ provide: FIELD_CIPHER, useClass: AesGcmFieldCipher }],
  exports: [FIELD_CIPHER],
})
export class EncryptionModule {}
