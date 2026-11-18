import {
  hasStarted,
  isCoveragePeriod,
  isDayPattern,
  isMinCount,
  periodsOverlap,
  sameMatch,
} from './coverage-rules'

const none = { workforce_category: null, profession: null, specialty: null, min_clinical_level: null }

describe('coverage rules', () => {
  it('knows the three day patterns', () => {
    for (const pattern of ['all', 'weekdays', 'weekends_holidays']) {
      expect(isDayPattern(pattern)).toBe(true)
    }
    expect(isDayPattern('weekends')).toBe(false)
  })

  it('accepts a minimum count from 1 to 99 only', () => {
    expect(isMinCount(1)).toBe(true)
    expect(isMinCount(99)).toBe(true)
    for (const bad of [0, 100, 1.5, -1, '3', null, Number.NaN]) {
      expect(isMinCount(bad)).toBe(false)
    }
  })

  it('accepts a real start from 2000-01-01 and an end that is empty or not before the start', () => {
    expect(isCoveragePeriod({ start: '2000-01-01', end: null })).toBe(true)
    expect(isCoveragePeriod({ start: '2027-03-01', end: '2027-03-01' })).toBe(true)
    expect(isCoveragePeriod({ start: '2027-03-01', end: '2027-12-31' })).toBe(true)
    for (const bad of [
      { start: '1999-12-31', end: null },
      { start: '2027-02-30', end: null },
      { start: '2027-03-02', end: '2027-03-01' },
      { start: '2027-03-01', end: 'nope' },
      { start: 'nope', end: null },
    ]) {
      expect(isCoveragePeriod(bad)).toBe(false)
    }
  })

  it('finds overlapping periods, open ends included, and shared boundary days', () => {
    const march = { start: '2027-03-01', end: '2027-03-31' }
    expect(periodsOverlap(march, { start: '2027-03-31', end: null })).toBe(true)
    expect(periodsOverlap(march, { start: '2027-04-01', end: null })).toBe(false)
    expect(periodsOverlap({ start: '2027-01-01', end: null }, { start: '2030-01-01', end: null })).toBe(true)
    expect(periodsOverlap(march, { start: '2027-01-01', end: '2027-02-28' })).toBe(false)
    expect(periodsOverlap(march, { start: '2027-03-10', end: '2027-03-12' })).toBe(true)
  })

  it('says a period has started on its first day, not before', () => {
    expect(hasStarted({ start: '2027-03-01', end: null }, '2027-03-01')).toBe(true)
    expect(hasStarted({ start: '2027-03-01', end: null }, '2027-02-28')).toBe(false)
    expect(hasStarted({ start: '2027-03-01', end: null }, '2028-01-01')).toBe(true)
  })

  it('compares criteria one by one, unset equal to unset only', () => {
    const nurse = { system: 'id.profession', code: 'nurse' }
    expect(sameMatch(none, { ...none })).toBe(true)
    expect(sameMatch({ ...none, profession: nurse }, { ...none, profession: { ...nurse } })).toBe(true)
    expect(sameMatch({ ...none, profession: nurse }, none)).toBe(false)
    expect(sameMatch({ ...none, profession: nurse }, { ...none, profession: { system: 'id.profession', code: 'doctor' } })).toBe(false)
    expect(sameMatch({ ...none, profession: nurse }, { ...none, profession: { system: 'sg.profession', code: 'nurse' } })).toBe(false)
    expect(sameMatch({ ...none, specialty: nurse }, { ...none, profession: nurse })).toBe(false)
  })
})
