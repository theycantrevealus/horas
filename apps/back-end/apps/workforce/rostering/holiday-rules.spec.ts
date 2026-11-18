import {
  compareHolidays,
  isCalendarYear,
  isCountryCode,
  isDateInYear,
  isHolidayKind,
  isSubdivisionCode,
  normalizeCalendarCode,
} from './holiday-rules'

describe('holiday rules', () => {
  it('cleans a calendar code and refuses a bad one', () => {
    expect(normalizeCalendarCode(' ID-National ')).toBe('id-national')
    expect(normalizeCalendarCode('rsud-2')).toBe('rsud-2')
    for (const bad of ['', 'a', '1abc', '-abc', 'has space', 'a'.repeat(33), 'under_score']) {
      expect(normalizeCalendarCode(bad)).toBeNull()
    }
  })

  it('accepts years from 2000 to 2100 only', () => {
    expect(isCalendarYear(2000)).toBe(true)
    expect(isCalendarYear(2100)).toBe(true)
    for (const bad of [1999, 2101, 2026.5, '2026', null, Number.NaN]) {
      expect(isCalendarYear(bad)).toBe(false)
    }
  })

  it('checks the country and the subdivision of that country', () => {
    expect(isCountryCode('ID')).toBe(true)
    for (const bad of ['id', 'IDN', 'I', 1, null]) {
      expect(isCountryCode(bad)).toBe(false)
    }
    expect(isSubdivisionCode('ID-JK', 'ID')).toBe(true)
    expect(isSubdivisionCode('ID-1A2', 'ID')).toBe(true)
    for (const bad of ['SG-01', 'ID-', 'ID-ABCD', 'id-jk', 'JK', 5]) {
      expect(isSubdivisionCode(bad, 'ID')).toBe(false)
    }
  })

  it('knows the three kinds', () => {
    for (const kind of ['public', 'collective_leave', 'local']) {
      expect(isHolidayKind(kind)).toBe(true)
    }
    expect(isHolidayKind('religious')).toBe(false)
  })

  it('accepts a real date inside the year only', () => {
    expect(isDateInYear('2027-08-17', 2027)).toBe(true)
    expect(isDateInYear('2028-02-29', 2028)).toBe(true)
    expect(isDateInYear('2027-02-29', 2027)).toBe(false)
    expect(isDateInYear('2026-12-31', 2027)).toBe(false)
    expect(isDateInYear('17-08-2027', 2027)).toBe(false)
    expect(isDateInYear(null, 2027)).toBe(false)
  })

  it('orders holidays by date and then kind', () => {
    const entry = (date: string, kind: 'public' | 'local') => ({
      date,
      kind,
      name: [],
      source: 'manual' as const,
      status: 'active' as const,
      import_id: null,
    })
    const sorted = [entry('2027-05-01', 'public'), entry('2027-01-01', 'public'), entry('2027-01-01', 'local')].sort(compareHolidays)
    expect(sorted.map((item) => `${item.date} ${item.kind}`)).toEqual([
      '2027-01-01 local',
      '2027-01-01 public',
      '2027-05-01 public',
    ])
  })
})
