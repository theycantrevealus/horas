import { type Address } from '@repository/model/common/address'
import { normalizeAddress } from './address'

const valid: Address = {
  use: 'work',
  lines: [' Jl. Sehat No. 1 '],
  admin_levels: [{ level: 1, code: '31.74', name: ' Jakarta Selatan ' }],
  city: ' Jakarta ',
  subdivision: 'ID-JK',
  postal_code: '12345',
  country: 'ID',
}

describe('normalizeAddress', () => {
  it('trims text and keeps only the given optional fields', () => {
    expect(normalizeAddress(valid)).toEqual({
      use: 'work',
      lines: ['Jl. Sehat No. 1'],
      admin_levels: [{ level: 1, code: '31.74', name: 'Jakarta Selatan' }],
      city: 'Jakarta',
      subdivision: 'ID-JK',
      postal_code: '12345',
      country: 'ID',
    })
    expect(
      normalizeAddress({
        use: 'home',
        lines: [],
        admin_levels: [],
        country: 'SG',
      }),
    ).toEqual({ use: 'home', lines: [], admin_levels: [], country: 'SG' })
  })

  it.each([
    ['unknown country', { country: 'XX' }],
    ['lower-case country', { country: 'id' }],
    ['subdivision that is not ISO 3166-2', { subdivision: 'Jakarta' }],
    ['6 lines', { lines: ['a', 'b', 'c', 'd', 'e', 'f'] }],
    ['empty line', { lines: ['  '] }],
    ['too long line', { lines: ['x'.repeat(201)] }],
    [
      '7 administrative levels',
      {
        admin_levels: Array.from({ length: 7 }, (_, i) => ({
          level: i + 1,
          name: 'n',
        })),
      },
    ],
    ['level number 0', { admin_levels: [{ level: 0, name: 'n' }] }],
    ['level without name', { admin_levels: [{ level: 1, name: ' ' }] }],
    ['empty city', { city: ' ' }],
    ['too long postal code', { postal_code: '1'.repeat(21) }],
  ])('returns null for %s', (_name, override) => {
    expect(normalizeAddress({ ...valid, ...override })).toBeNull()
  })
})
