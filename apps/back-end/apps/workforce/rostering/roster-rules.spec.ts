import { canMove, hasPeriodEnded, matchesRosterPeriod } from './roster-rules'

describe('roster rules', () => {
  it('knows the status moves of the lifecycle and no others', () => {
    expect(canMove('draft', 'submitted')).toBe(true)
    expect(canMove('draft', 'published')).toBe(true)
    expect(canMove('submitted', 'approved')).toBe(true)
    expect(canMove('submitted', 'draft')).toBe(true)
    expect(canMove('approved', 'published')).toBe(true)
    expect(canMove('approved', 'draft')).toBe(true)
    expect(canMove('published', 'closed')).toBe(true)
    for (const [from, to] of [
      ['draft', 'approved'],
      ['draft', 'closed'],
      ['submitted', 'published'],
      ['published', 'draft'],
      ['published', 'approved'],
      ['closed', 'draft'],
      ['closed', 'published'],
    ] as const) {
      expect(canMove(from, to)).toBe(false)
    }
  })

  it('accepts a calendar month, in leap years and in December', () => {
    expect(matchesRosterPeriod('month', { start: '2027-03-01', end: '2027-03-31' })).toBe(true)
    expect(matchesRosterPeriod('month', { start: '2027-04-01', end: '2027-04-30' })).toBe(true)
    expect(matchesRosterPeriod('month', { start: '2028-02-01', end: '2028-02-29' })).toBe(true)
    expect(matchesRosterPeriod('month', { start: '2027-02-01', end: '2027-02-28' })).toBe(true)
    expect(matchesRosterPeriod('month', { start: '2027-12-01', end: '2027-12-31' })).toBe(true)
    for (const bad of [
      { start: '2027-03-02', end: '2027-03-31' },
      { start: '2027-03-01', end: '2027-03-30' },
      { start: '2027-02-01', end: '2027-02-29' },
      { start: '2027-03-01', end: '2027-04-30' },
      { start: '2027-03-31', end: '2027-03-01' },
      { start: 'nope', end: '2027-03-31' },
    ]) {
      expect(matchesRosterPeriod('month', bad)).toBe(false)
    }
  })

  it('accepts a Monday to Sunday week and a Monday to the second Sunday', () => {
    // 2027-03-01 is a Monday.
    expect(matchesRosterPeriod('week', { start: '2027-03-01', end: '2027-03-07' })).toBe(true)
    expect(matchesRosterPeriod('week', { start: '2027-03-02', end: '2027-03-08' })).toBe(false)
    expect(matchesRosterPeriod('week', { start: '2027-03-01', end: '2027-03-14' })).toBe(false)
    expect(matchesRosterPeriod('two_weeks', { start: '2027-03-01', end: '2027-03-14' })).toBe(true)
    expect(matchesRosterPeriod('two_weeks', { start: '2027-03-01', end: '2027-03-07' })).toBe(false)
    expect(matchesRosterPeriod('two_weeks', { start: '2027-03-08', end: '2027-03-21' })).toBe(true)
    expect(matchesRosterPeriod('two_weeks', { start: '2027-03-07', end: '2027-03-20' })).toBe(false)
    expect(matchesRosterPeriod('week', { start: '2027-02-30', end: '2027-03-07' })).toBe(false)
  })

  it('says a period has ended only after its last day', () => {
    const march = { start: '2027-03-01', end: '2027-03-31' }
    expect(hasPeriodEnded(march, '2027-03-31')).toBe(false)
    expect(hasPeriodEnded(march, '2027-04-01')).toBe(true)
    expect(hasPeriodEnded(march, '2027-03-15')).toBe(false)
  })
})
