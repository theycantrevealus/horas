import {
  checkContractTerms,
  isValidFte,
  normalizeContractNumber,
} from './contract-rules'

describe('normalizeContractNumber', () => {
  it('trims and upper-cases a valid number', () => {
    expect(normalizeContractNumber(' pkwt/2026-001 ')).toBe('PKWT/2026-001')
  })

  it.each(['', '  ', '-abc', 'A B', 'A'.repeat(41), 'ab#1'])(
    'refuses %j',
    (value) => {
      expect(normalizeContractNumber(value)).toBeNull()
    },
  )
})

describe('isValidFte', () => {
  it.each([1, 0.5, 0.25, 0.05, 0.8])('accepts %s', (value) => {
    expect(isValidFte(value)).toBe(true)
  })

  it.each([0, -1, 1.01, 0.123, NaN, Infinity])('refuses %s', (value) => {
    expect(isValidFte(value)).toBe(false)
  })
})

describe('checkContractTerms', () => {
  const now = new Date('2026-03-10T12:00:00Z')
  const permanent = { requiresEndDate: false, allowsProbation: true }
  const fixedTerm = { requiresEndDate: true, allowsProbation: false }
  const terms = (override: object = {}) => ({
    start: '2026-01-01',
    end: null,
    probationEndDate: null,
    ...override,
  })

  it('accepts an open-ended permanent contract with a probation inside it', () => {
    expect(checkContractTerms(terms(), permanent, now)).toBeNull()
    expect(
      checkContractTerms(
        terms({ end: '2027-01-01', probationEndDate: '2026-04-01' }),
        permanent,
        now,
      ),
    ).toBeNull()
  })

  it('accepts a fixed-term contract with an end date, including a one-day contract', () => {
    expect(
      checkContractTerms(terms({ end: '2026-12-31' }), fixedTerm, now),
    ).toBeNull()
    expect(
      checkContractTerms(terms({ end: '2026-01-01' }), fixedTerm, now),
    ).toBeNull()
  })

  it('needs an end date for a type that requires one', () => {
    expect(checkContractTerms(terms(), fixedTerm, now)).toMatchObject({
      code: 'end_date_required',
    })
  })

  it.each([
    ['a bad start', { start: '2026-02-30' }],
    ['a bad end', { end: 'soon' }],
    ['an end before the start', { end: '2025-12-31' }],
    ['a start before 1950', { start: '1949-12-31' }],
    ['an end over ten years ahead', { end: '2036-03-12' }],
  ])('refuses %s as an invalid period', (_label, override) => {
    expect(checkContractTerms(terms(override), permanent, now)).toMatchObject({
      code: 'invalid_period',
    })
  })

  it('refuses a probation for a type that does not allow it, and one outside the period', () => {
    expect(
      checkContractTerms(
        terms({ end: '2026-12-31', probationEndDate: '2026-03-01' }),
        fixedTerm,
        now,
      ),
    ).toMatchObject({ code: 'probation_not_allowed' })
    for (const probationEndDate of ['2025-12-31', '2027-01-02']) {
      expect(
        checkContractTerms(
          terms({ end: '2027-01-01', probationEndDate }),
          permanent,
          now,
        ),
      ).toMatchObject({ code: 'invalid_probation_date' })
    }
  })
})
