import { normalizeWorkContacts } from './contacts'
import { normalizeName, normalizeOtherNames } from './names'
import { canTransition, latestEffectiveDate, needsReason } from './status'

describe('normalizeName', () => {
  it('trims the parts and keeps the use it was given', () => {
    expect(
      normalizeName(
        {
          text: '  dr. Siti Rahma, Sp.PD ',
          family: ' Rahma ',
          given: [' Siti '],
          prefix: [' dr. '],
          suffix: ['Sp.PD'],
        },
        'official',
      ),
    ).toEqual({
      use: 'official',
      text: 'dr. Siti Rahma, Sp.PD',
      family: 'Rahma',
      given: ['Siti'],
      prefix: ['dr.'],
      suffix: ['Sp.PD'],
    })
  })

  it('allows a single name and a native-script variant', () => {
    expect(normalizeName({ text: 'Suharto' }, 'official')).toEqual({
      use: 'official',
      text: 'Suharto',
      given: [],
      prefix: [],
      suffix: [],
    })
    expect(
      normalizeName({ text: 'سيتي', script: 'Arab' }, 'alias')?.script,
    ).toBe('Arab')
  })

  it.each([
    ['empty text', { text: '  ' }],
    ['text over 200 characters', { text: 'x'.repeat(201) }],
    ['an empty family name', { text: 'A', family: ' ' }],
    [
      'more than 5 given names',
      { text: 'A', given: ['a', 'b', 'c', 'd', 'e', 'f'] },
    ],
    ['an empty given name', { text: 'A', given: [''] }],
    ['a title over 30 characters', { text: 'A', prefix: ['x'.repeat(31)] }],
    ['a script that is not ISO 15924', { text: 'A', script: 'arab' }],
  ])('refuses %s', (_label, input) => {
    expect(normalizeName(input, 'official')).toBeNull()
  })
})

describe('normalizeOtherNames', () => {
  it('accepts up to 5 usual, maiden or alias names', () => {
    expect(
      normalizeOtherNames([
        { use: 'usual', text: 'Siti' },
        { use: 'maiden', text: 'Siti Nur' },
      ]),
    ).toHaveLength(2)
    expect(normalizeOtherNames([])).toEqual([])
  })

  it('refuses a missing or official use, more than 5 names and a bad name', () => {
    expect(normalizeOtherNames([{ text: 'Siti' }])).toBeNull()
    expect(normalizeOtherNames([{ use: 'official', text: 'Siti' }])).toBeNull()
    expect(
      normalizeOtherNames(
        Array.from({ length: 6 }, () => ({ use: 'alias' as const, text: 'x' })),
      ),
    ).toBeNull()
    expect(normalizeOtherNames([{ use: 'alias', text: '' }])).toBeNull()
  })
})

describe('normalizeWorkContacts', () => {
  it('cleans phones and lower-cases emails, always as work contacts', () => {
    expect(
      normalizeWorkContacts([
        { system: 'phone', value: ' +628121234567 ', is_primary: true },
        { system: 'email', value: ' Siti@Hospital.ID ' },
      ]),
    ).toEqual([
      {
        system: 'phone',
        value: '+628121234567',
        use: 'work',
        is_primary: true,
        verified_at: null,
      },
      {
        system: 'email',
        value: 'siti@hospital.id',
        use: 'work',
        is_primary: false,
        verified_at: null,
      },
    ])
    expect(normalizeWorkContacts([])).toEqual([])
  })

  it.each([
    [
      'a phone without a plus sign',
      [{ system: 'phone', value: '08121234567' }],
    ],
    ['a phone starting with +0', [{ system: 'phone', value: '+0812345678' }]],
    ['a phone that is too short', [{ system: 'phone', value: '+62812' }]],
    ['an email without a domain dot', [{ system: 'email', value: 'a@b' }]],
    ['an email with a space', [{ system: 'email', value: 'a b@c.id' }]],
    ['an unknown system', [{ system: 'other', value: 'x' }]],
    [
      'a repeated contact',
      [
        { system: 'phone', value: '+628121234567' },
        { system: 'phone', value: '+628121234567' },
      ],
    ],
    [
      'two primary phones',
      [
        { system: 'phone', value: '+628121234567', is_primary: true },
        { system: 'phone', value: '+628121234568', is_primary: true },
      ],
    ],
    [
      'more than 5 contacts',
      Array.from({ length: 6 }, (_, index) => ({
        system: 'phone',
        value: `+62812123456${index}`,
      })),
    ],
  ])('refuses %s', (_label, inputs) => {
    expect(normalizeWorkContacts(inputs as never)).toBeNull()
  })

  it('allows one primary phone and one primary email', () => {
    expect(
      normalizeWorkContacts([
        { system: 'phone', value: '+628121234567', is_primary: true },
        { system: 'email', value: 'a@b.id', is_primary: true },
      ]),
    ).toHaveLength(2)
  })
})

describe('employment status transitions', () => {
  it.each([
    ['onboarding', 'probation'],
    ['onboarding', 'active'],
    ['onboarding', 'separated'],
    ['probation', 'active'],
    ['probation', 'separated'],
    ['active', 'suspended'],
    ['active', 'separated'],
    ['suspended', 'active'],
    ['suspended', 'separated'],
  ] as const)('allows %s to %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  it.each([
    ['probation', 'onboarding'],
    ['probation', 'suspended'],
    ['active', 'onboarding'],
    ['active', 'probation'],
    ['active', 'active'],
    ['suspended', 'probation'],
    ['separated', 'active'],
    ['separated', 'onboarding'],
    ['separated', 'separated'],
  ] as const)('refuses %s to %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('needs a reason for suspended and separated only', () => {
    expect(needsReason('suspended')).toBe(true)
    expect(needsReason('separated')).toBe(true)
    expect(needsReason('active')).toBe(false)
    expect(needsReason('probation')).toBe(false)
  })

  it('allows a change up to tomorrow in UTC', () => {
    expect(latestEffectiveDate(new Date('2026-03-10T12:00:00Z'))).toBe(
      '2026-03-11',
    )
    expect(latestEffectiveDate(new Date('2026-12-31T23:00:00Z'))).toBe(
      '2027-01-01',
    )
  })
})
