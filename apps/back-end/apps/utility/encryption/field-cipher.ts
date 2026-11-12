/**
 * Injection token of the field cipher.
 */
export const FIELD_CIPHER = Symbol('FIELD_CIPHER')

/**
 * Raised when a stored value cannot be decrypted: a wrong or changed key, a damaged value, a value
 * that belongs to another tenant or field, or text that is not a ciphertext. The message never
 * holds the value.
 */
export class FieldCipherError extends Error {
  /**
   * @param message - Description without any value.
   */
  constructor(message: string) {
    super(message)
    this.name = 'FieldCipherError'
  }
}

/**
 * Encrypts, decrypts and hashes the secret fields of one tenant (`database.md` 4.6). Only
 * repository implementations use it: business code never sees ciphertext.
 */
export interface FieldCipher {
  /**
   * Encrypts a value for a field of a tenant. The tenant and the field are bound into the result, so
   * it can be decrypted only for the same tenant and field.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Stable name of the field, for example `birth_date`.
   * @param plaintext - Value to encrypt.
   * @returns The ciphertext as text.
   */
  encrypt(tenantId: string, field: string, plaintext: string): string

  /**
   * Decrypts a value written by `encrypt`.
   *
   * @param tenantId - Tenant that owns the value.
   * @param field - Name of the field the value was encrypted for.
   * @param ciphertext - Value written by `encrypt`.
   * @returns The plain value.
   * @throws FieldCipherError when the value cannot be decrypted.
   */
  decrypt(tenantId: string, field: string, ciphertext: string): string

  /**
   * Computes the lookup hash of a normalized value: the same value always gives the same hash inside
   * one tenant, and a different hash in another tenant.
   *
   * @param tenantId - Tenant that owns the value.
   * @param normalizedValue - Value after normalization.
   * @returns The hash as lower-case hex.
   */
  hash(tenantId: string, normalizedValue: string): string
}

/**
 * Hides all but the last four characters of a value, keeping its length. A value of four characters
 * or fewer is hidden completely.
 *
 * @param value - Plain value.
 * @returns The masked value, for example `************1234`.
 */
export function mask(value: string): string {
  const characters = Array.from(value)
  const visible = characters.length > 4 ? characters.slice(-4) : []
  return '*'.repeat(characters.length - visible.length) + visible.join('')
}
