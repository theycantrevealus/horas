import { diffEntity, maskValue } from './diff'
import { type FieldClassification } from './record'

/**
 * Model used to exercise the diff.
 */
interface Person {
  id: string
  tenant_id: string
  version: number
  updated_at: Date
  name: string
  note?: string
  password_hash?: string
  identifiers: { system: string; value_masked: string; value_hash: string }[]
  holds: { reason: string; source: string; until: string | null }[]
  tags: string[]
  profile: { display_name: string; phone?: string }
}

const classification: FieldClassification<Person> = {
  default: 'internal',
  fields: {
    name: 'public',
    'profile.phone': 'confidential',
    identifiers: 'confidential',
    password_hash: 'secret',
    note: 'highly_confidential',
  },
  arrayKeys: { identifiers: ['system'], holds: ['reason', 'source'] },
}

/**
 * Builds a person with sensible defaults.
 *
 * @param changes - Fields to override.
 * @returns The person.
 */
function person(changes: Partial<Person> = {}): Person {
  return {
    id: 'p1',
    tenant_id: 't1',
    version: 1,
    updated_at: new Date('2026-01-01T00:00:00Z'),
    name: 'Siti',
    identifiers: [
      { system: 'id.nik', value_masked: '************1234', value_hash: 'h1' },
    ],
    holds: [{ reason: 'security', source: 'hr', until: null }],
    tags: ['a'],
    profile: { display_name: 'Siti R.' },
    ...changes,
  }
}

describe('diffEntity', () => {
  it('returns nothing when only ignored fields changed', () => {
    const after = person({ version: 2, updated_at: new Date() })
    expect(diffEntity(person(), after, classification)).toEqual([])
  })

  it('lists every non-empty field of a create with before null', () => {
    const changes = diffEntity(null, person(), classification)
    expect(changes.map((change) => change.path)).toEqual([
      'holds[reason=security,source=hr].reason',
      'holds[reason=security,source=hr].source',
      'identifiers[system=id.nik]',
      'name',
      'profile.display_name',
      'tags',
    ])
    expect(changes.every((change) => change.before === null)).toBe(true)
  })

  it('lists no fields for a delete', () => {
    expect(diffEntity(person(), null, classification)).toEqual([])
  })

  it('diffs nested objects and keeps plain values of public and internal fields', () => {
    const after = person({
      name: 'Siti Rahma',
      profile: { display_name: 'Dr. Siti' },
    })
    expect(diffEntity(person(), after, classification)).toEqual([
      { path: 'name', class: 'public', before: 'Siti', after: 'Siti Rahma' },
      {
        path: 'profile.display_name',
        class: 'internal',
        before: 'Siti R.',
        after: 'Dr. Siti',
      },
    ])
  })

  it('matches array items by their key, so reordering is not a change', () => {
    const before = person({
      holds: [
        { reason: 'security', source: 'hr', until: null },
        { reason: 'leave', source: 'hr', until: null },
      ],
    })
    const after = person({
      holds: [
        { reason: 'leave', source: 'hr', until: '2026-02-01' },
        { reason: 'security', source: 'hr', until: null },
      ],
    })
    expect(diffEntity(before, after, classification)).toEqual([
      {
        path: 'holds[reason=leave,source=hr].until',
        class: 'internal',
        before: null,
        after: '2026-02-01',
      },
    ])
  })

  it('stores only the masked form of confidential identifiers', () => {
    const after = person({
      identifiers: [
        {
          system: 'id.nik',
          value_masked: '************9999',
          value_hash: 'h2',
        },
      ],
    })
    expect(diffEntity(person(), after, classification)).toEqual([
      {
        path: 'identifiers[system=id.nik]',
        class: 'confidential',
        before: { masked: 'partial', display: '************1234' },
        after: { masked: 'partial', display: '************9999' },
      },
    ])
  })

  it('never stores secret or highly confidential values', () => {
    const after = person({ password_hash: 'new-hash', note: 'diagnosis' })
    const changes = diffEntity(
      person({ password_hash: 'old-hash' }),
      after,
      classification,
    )
    expect(changes).toEqual([
      {
        path: 'note',
        class: 'highly_confidential',
        before: null,
        after: { masked: 'changed' },
      },
      {
        path: 'password_hash',
        class: 'secret',
        before: { masked: 'changed' },
        after: { masked: 'changed' },
      },
    ])
    expect(JSON.stringify(changes)).not.toMatch(/new-hash|old-hash|diagnosis/)
  })

  it('masks confidential values without a masked form as changed', () => {
    const after = person({
      profile: { display_name: 'Siti R.', phone: '+628123' },
    })
    expect(diffEntity(person(), after, classification)).toEqual([
      {
        path: 'profile.phone',
        class: 'confidential',
        before: null,
        after: { masked: 'changed' },
      },
    ])
  })

  it('treats arrays without a declared key as one value', () => {
    const after = person({ tags: ['a', 'b'] })
    expect(diffEntity(person(), after, classification)).toEqual([
      { path: 'tags', class: 'internal', before: ['a'], after: ['a', 'b'] },
    ])
  })
})

describe('maskValue', () => {
  it('stores dates as ISO strings', () => {
    expect(maskValue(new Date('2026-01-02T03:04:05Z'), 'internal')).toBe(
      '2026-01-02T03:04:05.000Z',
    )
  })

  it('never shows the encrypted value or hash of an identifier, even when public', () => {
    const identifier = {
      value_masked: '***1',
      value_hash: 'h',
      value_encrypted: 'x',
    }
    expect(maskValue(identifier, 'public')).toEqual({
      masked: 'partial',
      display: '***1',
    })
    expect(maskValue(identifier, 'secret')).toEqual({ masked: 'changed' })
  })
})
