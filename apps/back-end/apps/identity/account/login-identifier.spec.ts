import {
  detectIdentifierType,
  normalizeIdentifier,
  toLoginIdentifier,
} from './login-identifier'

describe('login identifiers', () => {
  it('detects the kind of identifier', () => {
    expect(detectIdentifierType('siti@rs.example')).toBe('email')
    expect(detectIdentifierType('+62 812-3456-7890')).toBe('phone')
    expect(detectIdentifierType('siti.rahma')).toBe('username')
    expect(detectIdentifierType('081234567890')).toBe('username')
  })

  it('normalizes so lookups ignore case, width and spacing', () => {
    expect(normalizeIdentifier('username', '  Siti.Rahma ')).toBe('siti.rahma')
    expect(normalizeIdentifier('email', 'Siti@RS.Example')).toBe(
      'siti@rs.example',
    )
    expect(normalizeIdentifier('username', 'ＡＢＣ')).toBe('abc')
    expect(normalizeIdentifier('phone', '+62 812-3456-7890')).toBe(
      '+628123456789' + '0',
    )
  })

  it('builds the stored form with the display value kept', () => {
    expect(toLoginIdentifier('username', ' Siti.Rahma ', true)).toEqual({
      type: 'username',
      value: 'Siti.Rahma',
      normalized: 'siti.rahma',
      is_primary: true,
      verified_at: null,
    })
  })
})
