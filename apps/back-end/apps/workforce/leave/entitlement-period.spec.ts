import { entitlementPeriod, hasMinService } from './entitlement-period'

describe('entitlementPeriod', () => {
  it('runs a calendar year from 1 January to 31 December of the date', () => {
    expect(entitlementPeriod('calendar_year', '2024-03-01', '2026-07-10')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    })
  })

  it('runs a service year from the anniversary on or before the date to the day before the next', () => {
    expect(entitlementPeriod('service_year', '2024-03-15', '2026-11-19')).toEqual({
      start: '2026-03-15',
      end: '2027-03-14',
    })
    expect(entitlementPeriod('service_year', '2024-03-15', '2026-03-15')).toEqual({
      start: '2026-03-15',
      end: '2027-03-14',
    })
    expect(entitlementPeriod('service_year', '2024-03-15', '2026-03-14')).toEqual({
      start: '2025-03-15',
      end: '2026-03-14',
    })
  })

  it('moves an anniversary on 29 February to 28 February in a year without it', () => {
    expect(entitlementPeriod('service_year', '2024-02-29', '2027-03-01')).toEqual({
      start: '2027-02-28',
      end: '2028-02-28',
    })
    expect(entitlementPeriod('service_year', '2024-02-29', '2028-02-29')).toEqual({
      start: '2028-02-29',
      end: '2029-02-27',
    })
  })

  it('answers the first service year for a date before the service started', () => {
    expect(entitlementPeriod('service_year', '2024-03-15', '2024-01-01')).toEqual({
      start: '2024-03-15',
      end: '2025-03-14',
    })
  })
})

describe('hasMinService', () => {
  it('checks the whole months of service on the first day of a period', () => {
    expect(hasMinService('2026-03-01', '2027-01-01', 12)).toBe(false)
    expect(hasMinService('2026-03-01', '2027-03-01', 12)).toBe(true)
    expect(hasMinService('2026-03-01', '2028-01-01', 12)).toBe(true)
    expect(hasMinService('2026-03-01', '2026-03-01', 0)).toBe(true)
  })
})
