import {
  addDays,
  addYears,
  APPOINTMENT_NUMBER,
  isLicenseValidOn,
  latestEnd,
} from './appointment-rules'

describe('appointment rules', () => {
  it('accepts upper case numbers with digits, slash, dot and hyphen, 1 to 64 characters', () => {
    for (const value of ['SPK/001/RS/2026', 'A', 'SK-12.3', '1'.repeat(64)]) {
      expect(APPOINTMENT_NUMBER.test(value)).toBe(true)
    }
    for (const value of ['', 'spk/1', '/1', ' SPK', 'SPK 1', 'A'.repeat(65), 'SPK_1']) {
      expect(APPOINTMENT_NUMBER.test(value)).toBe(false)
    }
  })

  it('adds days and years to a local date without a time zone', () => {
    expect(addDays('2026-03-10', 1)).toBe('2026-03-11')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addYears('2026-03-10', 3)).toBe('2029-03-10')
    expect(addYears('2024-02-29', 1)).toBe('2025-03-01')
  })

  it('counts the first day: three years from 10 March end on 9 March, thirty days from 10 March end on 8 April', () => {
    expect(latestEnd('2026-03-10', { years: 3 })).toBe('2029-03-09')
    expect(latestEnd('2026-03-10', { days: 30 })).toBe('2026-04-08')
    expect(latestEnd('2026-03-10', { days: 1 })).toBe('2026-03-10')
  })

  it('reads the status and both dates of a licence', () => {
    const base = { status: 'valid' as const, issue_date: '2025-01-01', expiry_date: null }
    expect(isLicenseValidOn(base, '2026-03-10')).toBe(true)
    expect(isLicenseValidOn({ ...base, expiry_date: '2026-03-10' }, '2026-03-10')).toBe(true)
    expect(isLicenseValidOn({ ...base, expiry_date: '2026-03-09' }, '2026-03-10')).toBe(false)
    expect(isLicenseValidOn({ ...base, issue_date: '2026-03-11' }, '2026-03-10')).toBe(false)
    for (const status of ['pending_verification', 'rejected', 'expired', 'revoked', 'superseded'] as const) {
      expect(isLicenseValidOn({ ...base, status }, '2026-03-10')).toBe(false)
    }
  })
})
