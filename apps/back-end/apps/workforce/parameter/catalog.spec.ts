import {
  findParameter,
  PARAMETER_CATALOG,
  type ParameterScopeKind,
} from './catalog'
import { checkValue } from './value-types'

describe('parameter catalog', () => {
  const kinds: ParameterScopeKind[] = [
    'tenant',
    'organization',
    'facility',
    'unit',
    'committee',
  ]

  it('has no repeated key and keys in upper case with underscores', () => {
    const keys = PARAMETER_CATALOG.map(({ key }) => key)

    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.every((key) => /^[A-Z][A-Z0-9_]+$/.test(key))).toBe(true)
  })

  it('gives every key at least one known scope', () => {
    for (const definition of PARAMETER_CATALOG) {
      expect(definition.scopes.length).toBeGreaterThan(0)
      expect(definition.scopes.every((scope) => kinds.includes(scope))).toBe(
        true,
      )
    }
  })

  it('has a default that passes its own type for every key', () => {
    for (const definition of PARAMETER_CATALOG) {
      expect(checkValue(definition.type, definition.default)).toEqual(
        definition.default,
      )
    }
  })

  it('holds the defaults of HR specification 10', () => {
    expect(findParameter('LICENSE_ALERT_DAYS')?.default).toEqual([
      180, 90, 60, 30,
    ])
    expect(findParameter('MAX_WEEKLY_HOURS')?.default).toBe(40)
    expect(findParameter('MIN_REST_HOURS')?.default).toBe(8)
    expect(findParameter('CREDENTIALING_SCOPE')?.default).toBe('facility')
    expect(findParameter('ROSTER_APPROVAL_REQUIRED')?.default).toBe(true)
    expect(findParameter('IMPORT_MAX_ROWS')?.default).toBe(5000)
  })

  it('limits the tenant-only and committee keys to their scopes', () => {
    expect(findParameter('CREDENTIALING_SCOPE')?.scopes).toEqual(['tenant'])
    expect(findParameter('MIN_ASSESSORS')?.scopes).toEqual(['committee'])
  })

  it('finds a key and answers undefined for an unknown one', () => {
    expect(findParameter('MAX_WEEKLY_HOURS')?.key).toBe('MAX_WEEKLY_HOURS')
    expect(findParameter('NOPE')).toBeUndefined()
  })
})

describe('checkValue', () => {
  it('accepts whole numbers inside the limits and refuses the rest', () => {
    const type = { kind: 'integer', min: 1, max: 20 } as const

    expect(checkValue(type, 3)).toBe(3)
    expect(checkValue(type, 1)).toBe(1)
    expect(checkValue(type, 20)).toBe(20)
    for (const bad of [0, 21, 1.5, '3', null, undefined, NaN, true]) {
      expect(checkValue(type, bad)).toBeUndefined()
    }
  })

  it('accepts decimals inside the limits and refuses text and non-finite numbers', () => {
    const type = { kind: 'decimal', min: 1, max: 168 } as const

    expect(checkValue(type, 37.5)).toBe(37.5)
    for (const bad of [0.5, 400, Infinity, NaN, '40']) {
      expect(checkValue(type, bad)).toBeUndefined()
    }
  })

  it('accepts booleans only', () => {
    expect(checkValue({ kind: 'boolean' }, false)).toBe(false)
    expect(checkValue({ kind: 'boolean' }, 'true')).toBeUndefined()
    expect(checkValue({ kind: 'boolean' }, 1)).toBeUndefined()
  })

  it('accepts one of the listed choices only', () => {
    const type = { kind: 'choice', choices: ['facility', 'group'] } as const

    expect(checkValue(type, 'group')).toBe('group')
    expect(checkValue(type, 'Group')).toBeUndefined()
    expect(checkValue(type, 3)).toBeUndefined()
  })

  it('stores an integer list from the largest to the smallest', () => {
    expect(checkValue({ kind: 'integer_list' }, [30, 180, 60, 90])).toEqual([
      180, 90, 60, 30,
    ])
  })

  it('refuses an empty, repeated, too long or non-positive integer list', () => {
    const type = { kind: 'integer_list' } as const

    for (const bad of [
      [],
      [30, 30],
      [0, 30],
      [-1],
      [1.5],
      ['30'],
      'x',
      Array.from({ length: 11 }, (_, index) => index + 1),
    ]) {
      expect(checkValue(type, bad)).toBeUndefined()
    }
  })

  it('cleans a list of professions and points and refuses bad entries', () => {
    const type = { kind: 'profession_points' } as const
    const entry = {
      profession: { system: 'id.profession', code: 'perawat', extra: 1 },
      points: 25,
    }

    expect(checkValue(type, [entry])).toEqual([
      { profession: { system: 'id.profession', code: 'perawat' }, points: 25 },
    ])
    expect(checkValue(type, [])).toEqual([])
    for (const bad of [
      'x',
      [null],
      [{ profession: 'perawat', points: 1 }],
      [{ profession: { system: 'a', code: 'b' }, points: -1 }],
      [{ profession: { system: 'a', code: 'b' }, points: 10001 }],
      [{ profession: { system: 'a', code: 'b' }, points: 1.5 }],
      [
        { profession: { system: 'a', code: 'b' }, points: 1 },
        { profession: { system: 'a', code: 'b' }, points: 2 },
      ],
    ]) {
      expect(checkValue(type, bad)).toBeUndefined()
    }
  })
})
