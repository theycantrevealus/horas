import { normalizeProperties } from './properties'

describe('normalizeProperties', () => {
  it('accepts scalars, lists of scalars and the empty object, and returns a copy', () => {
    const input = {
      is_clinical: true,
      committee: 'komite_medik',
      max_locations: 3,
      note: null,
      tags: ['a', 'b', 1, false, null],
    }
    const result = normalizeProperties(input)

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
    expect(normalizeProperties({})).toEqual({})
  })

  it.each([
    ['an array', []],
    ['null', null],
    ['text', 'x'],
    ['a nested object', { a: { b: 1 } }],
    ['a list of objects', { a: [{ b: 1 }] }],
    ['a key with capitals', { IsClinical: true }],
    ['a key with a dot', { 'a.b': true }],
    ['a key starting with a digit', { '1a': true }],
    ['a key over 64 characters', { ['a'.repeat(65)]: true }],
    ['a non-finite number', { a: Infinity }],
    ['text over 500 characters', { a: 'x'.repeat(501) }],
    ['a list over 50 items', { a: Array.from({ length: 51 }, () => 1) }],
    [
      '31 keys',
      Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${i}`, 1])),
    ],
    [
      'over 4 KB',
      Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [`k${i}`, 'x'.repeat(400)]),
      ),
    ],
  ])('rejects %s', (_name, value) => {
    expect(normalizeProperties(value)).toBeNull()
  })
})
