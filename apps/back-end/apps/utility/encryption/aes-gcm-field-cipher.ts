import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto'
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common'
import { type ConfigType } from '@nestjs/config'
import { EncryptionConfig } from '@configuration/encryption'
import { FieldCipher, FieldCipherError } from './field-cipher'

/**
 * Version of the ciphertext format, which also names the key version: a later rotation adds `v2`.
 */
const VERSION = 'v1'

/**
 * Bytes of the initialization vector and of the authentication tag.
 */
const IV_BYTES = 12
const TAG_BYTES = 16

/**
 * Bytes of a derived key.
 */
const KEY_BYTES = 32

/**
 * Key material of the cipher.
 *
 * @property masterKey - 32-byte secret the per-tenant data keys derive from.
 * @property hashKey - 32-byte secret the per-tenant hash keys derive from.
 */
export interface FieldCipherKeys {
  masterKey: Buffer
  hashKey: Buffer
}

/**
 * AES-256-GCM field cipher. Each tenant gets its own data key and its own hash key, derived with
 * HKDF-SHA256 from the secrets in the configuration, so no key is stored and one tenant's key tells
 * nothing about another's. A ciphertext is `v1:<iv>:<tag>:<data>` in base64url. The tenant and the
 * field name are the authenticated data, so a value moved to another tenant or field fails to
 * decrypt.
 */
@Injectable()
export class AesGcmFieldCipher implements FieldCipher, OnModuleInit {
  private readonly dataKeys = new Map<string, Buffer>()
  private readonly hashKeys = new Map<string, Buffer>()
  private readonly keys: FieldCipherKeys

  /**
   * @param config - The `encryption` configuration with the two secrets.
   */
  constructor(
    @Inject(EncryptionConfig.KEY) config: ConfigType<typeof EncryptionConfig>,
  ) {
    if (
      config.masterKey.length !== KEY_BYTES ||
      config.hashKey.length !== KEY_BYTES
    ) {
      throw new FieldCipherError('The encryption keys must be 32 bytes each')
    }
    this.keys = { masterKey: config.masterKey, hashKey: config.hashKey }
  }

  /**
   * Checks that the keys work, so a broken setup stops the application at start. This cannot tell a
   * wrong key from the right one: a key that differs from the one that wrote the stored data shows
   * up only when that data is read.
   *
   * @throws FieldCipherError when a round trip fails.
   */
  onModuleInit(): void {
    const probe = 'self-test'
    const sealed = this.encrypt(probe, 'self_test', probe)
    if (
      this.decrypt(probe, 'self_test', sealed) !== probe ||
      !this.hash(probe, probe)
    ) {
      throw new FieldCipherError('The field cipher self-test failed')
    }
  }

  /**
   * Encrypts a value for a field of a tenant.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Stable name of the field.
   * @param plaintext - Value to encrypt.
   * @returns The ciphertext as text.
   */
  encrypt(tenantId: string, field: string, plaintext: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', this.dataKey(tenantId), iv)
    cipher.setAAD(this.context(tenantId, field))
    const data = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ])
    return [
      VERSION,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      data.toString('base64url'),
    ].join(':')
  }

  /**
   * Decrypts a value written by `encrypt`.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Name of the field the value was encrypted for.
   * @param ciphertext - Value written by `encrypt`.
   * @returns The plain value.
   * @throws FieldCipherError when the value cannot be decrypted.
   */
  decrypt(tenantId: string, field: string, ciphertext: string): string {
    const [version, iv, tag, data, ...rest] = ciphertext.split(':')
    if (
      version !== VERSION ||
      !iv ||
      !tag ||
      data === undefined ||
      rest.length
    ) {
      throw new FieldCipherError('The value is not a valid ciphertext')
    }
    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.dataKey(tenantId),
        Buffer.from(iv, 'base64url'),
        { authTagLength: TAG_BYTES },
      )
      decipher.setAAD(this.context(tenantId, field))
      decipher.setAuthTag(Buffer.from(tag, 'base64url'))
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      throw new FieldCipherError('The value could not be decrypted')
    }
  }

  /**
   * Computes the lookup hash of a normalized value under the tenant's hash key.
   *
   * @param tenantId - Tenant that owns the value.
   * @param normalizedValue - Value after normalization.
   * @returns The hash as lower-case hex.
   */
  hash(tenantId: string, normalizedValue: string): string {
    return createHmac('sha256', this.hashKey(tenantId))
      .update(normalizedValue, 'utf8')
      .digest('hex')
  }

  /**
   * Authenticated data of one field of one tenant.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Name of the field.
   * @returns The bytes bound into the encryption.
   */
  private context(tenantId: string, field: string): Buffer {
    return Buffer.from(`${tenantId}|${field}`, 'utf8')
  }

  /**
   * Returns the data key of a tenant, deriving it on first use.
   *
   * @param tenantId - Tenant that owns the value.
   * @returns The 32-byte key.
   */
  private dataKey(tenantId: string): Buffer {
    return this.derived(this.dataKeys, this.keys.masterKey, tenantId, 'encrypt')
  }

  /**
   * Returns the hash key of a tenant, deriving it on first use.
   *
   * @param tenantId - Tenant that owns the value.
   * @returns The 32-byte key.
   */
  private hashKey(tenantId: string): Buffer {
    return this.derived(this.hashKeys, this.keys.hashKey, tenantId, 'hash')
  }

  /**
   * Derives and caches a per-tenant key with HKDF-SHA256.
   *
   * @param cache - Keys derived so far.
   * @param root - Secret the key derives from.
   * @param tenantId - Tenant the key is for; the salt.
   * @param purpose - What the key is used for; part of the HKDF info.
   * @returns The 32-byte key.
   */
  private derived(
    cache: Map<string, Buffer>,
    root: Buffer,
    tenantId: string,
    purpose: string,
  ): Buffer {
    const known = cache.get(tenantId)
    if (known) {
      return known
    }
    const key = Buffer.from(
      hkdfSync(
        'sha256',
        root,
        Buffer.from(tenantId, 'utf8'),
        Buffer.from(`horas:${purpose}:${VERSION}`, 'utf8'),
        KEY_BYTES,
      ),
    )
    cache.set(tenantId, key)
    return key
  }
}
