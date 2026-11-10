import { isCountryCode, isCurrencyCode } from './iso-codes'

describe('isCountryCode', () => {
  it.each(['ID', 'SG', 'US', 'GB', 'JP'])('accepts %s', (code) => {
    expect(isCountryCode(code)).toBe(true)
  })

  it.each(['XX', 'ZZ', 'AA', 'id', 'USA', 'I', '', 'I D', 12, null, undefined])(
    'rejects %o',
    (value) => {
      expect(isCountryCode(value)).toBe(false)
    },
  )
})

describe('isCurrencyCode', () => {
  it.each(['IDR', 'USD', 'SGD', 'EUR'])('accepts %s', (code) => {
    expect(isCurrencyCode(code)).toBe(true)
  })

  it.each(['XXX', 'ABC', 'idr', 'ID', '', 7, null])('rejects %o', (value) => {
    expect(isCurrencyCode(value)).toBe(false)
  })
})
