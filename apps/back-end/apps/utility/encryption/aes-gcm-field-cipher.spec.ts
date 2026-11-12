import { createTestFieldCipher } from '../testing/test-field-cipher'
import { FieldCipherError, mask } from './field-cipher'

describe('AesGcmFieldCipher', () => {
  const cipher = createTestFieldCipher()

  it('decrypts what it encrypted, including text outside ASCII', () => {
    for (const value of ['3174011234567890', '', 'Jl. Sehat № 1 — 東京']) {
      const sealed = cipher.encrypt('t1', 'identifier', value)

      expect(cipher.decrypt('t1', 'identifier', sealed)).toBe(value)
    }
  })

  it('gives a different ciphertext each time and never contains the value', () => {
    const first = cipher.encrypt('t1', 'identifier', '3174011234567890')
    const second = cipher.encrypt('t1', 'identifier', '3174011234567890')

    expect(first).not.toBe(second)
    expect(first).toMatch(/^v1:[\w-]+:[\w-]+:[\w-]*$/)
    expect(first).not.toContain('3174011234567890')
  })

  it('refuses a ciphertext moved to another tenant or another field', () => {
    const sealed = cipher.encrypt('t1', 'identifier', 'secret')

    expect(() => cipher.decrypt('t2', 'identifier', sealed)).toThrow(
      FieldCipherError,
    )
    expect(() => cipher.decrypt('t1', 'bank_account', sealed)).toThrow(
      FieldCipherError,
    )
  })

  it('refuses a changed ciphertext, a wrong key and text that is not a ciphertext', () => {
    const sealed = cipher.encrypt('t1', 'identifier', 'secret')
    const [version, iv, tag, data] = sealed.split(':')
    const flipped = `${data.startsWith('A') ? 'B' : 'A'}${data.slice(1)}`

    expect(() =>
      cipher.decrypt('t1', 'identifier', [version, iv, tag, flipped].join(':')),
    ).toThrow(FieldCipherError)
    expect(() =>
      createTestFieldCipher('b').decrypt('t1', 'identifier', sealed),
    ).toThrow(FieldCipherError)
    for (const bad of ['', 'plain', 'v2:a:b:c', 'v1:a:b', 'v1:a:b:c:d']) {
      expect(() => cipher.decrypt('t1', 'identifier', bad)).toThrow(
        FieldCipherError,
      )
    }
  })

  it('never puts the value in an error message', () => {
    const sealed = cipher.encrypt('t1', 'identifier', 'topsecret-value')

    try {
      cipher.decrypt('t2', 'identifier', sealed)
    } catch (error: unknown) {
      expect(String(error)).not.toContain('topsecret-value')
      expect(String(error)).not.toContain(sealed)
    }
  })

  it('hashes the same value to the same hash in a tenant and to another hash in another tenant or key', () => {
    const one = cipher.hash('t1', '3174011234567890')

    expect(one).toMatch(/^[0-9a-f]{64}$/)
    expect(cipher.hash('t1', '3174011234567890')).toBe(one)
    expect(cipher.hash('t2', '3174011234567890')).not.toBe(one)
    expect(cipher.hash('t1', '3174011234567891')).not.toBe(one)
    expect(createTestFieldCipher('b').hash('t1', '3174011234567890')).not.toBe(
      one,
    )
    expect(one).not.toContain('3174011234567890')
  })

  it('passes its start-up self-test, and refuses keys of the wrong length', () => {
    expect(() => cipher.onModuleInit()).not.toThrow()
    expect(
      () =>
        new (cipher.constructor as new (config: unknown) => unknown)({
          masterKey: Buffer.alloc(16),
          hashKey: Buffer.alloc(32),
        }),
    ).toThrow(FieldCipherError)
  })
})

describe('mask', () => {
  it('keeps the last four characters and the length', () => {
    expect(mask('3174011234567890')).toBe('************7890')
    expect(mask('12345')).toBe('*2345')
  })

  it('hides a value of four characters or fewer completely', () => {
    expect(mask('1234')).toBe('****')
    expect(mask('ab')).toBe('**')
    expect(mask('')).toBe('')
  })

  it('counts characters, not bytes', () => {
    expect(mask('東京都新宿区')).toBe('**都新宿区')
  })
})
