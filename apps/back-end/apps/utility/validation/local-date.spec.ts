import {
  compareLocalDates,
  isLocalDate,
  isValidPeriod,
  todayInZone,
  zonedInstant,
  todayUtc,
} from './local-date'

describe('isLocalDate', () => {
  it.each([
    '2026-02-28',
    '2028-02-29',
    '2000-02-29',
    '1999-12-31',
    '0099-01-01',
  ])('accepts %s', (value) => {
    expect(isLocalDate(value)).toBe(true)
  })

  it.each([
    '2026-02-30',
    '2027-02-29',
    '1900-02-29',
    '2026-13-01',
    '2026-00-10',
    '2026-04-31',
    '26-01-01',
    '2026-1-1',
    '2026-01-01T00:00:00Z',
    '',
    new Date(),
    20260101,
    null,
    undefined,
  ])('rejects %o', (value) => {
    expect(isLocalDate(value)).toBe(false)
  })
})

describe('compareLocalDates', () => {
  it('orders dates', () => {
    expect(compareLocalDates('2026-01-01', '2026-01-02')).toBeLessThan(0)
    expect(compareLocalDates('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
    expect(compareLocalDates('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('isValidPeriod', () => {
  it('accepts an open-ended period, a one-day period and a longer one', () => {
    expect(isValidPeriod({ start: '2026-05-01', end: null })).toBe(true)
    expect(isValidPeriod({ start: '2026-05-01', end: '2026-05-01' })).toBe(true)
    expect(isValidPeriod({ start: '2026-05-01', end: '2026-12-31' })).toBe(true)
  })

  it('rejects an end before the start and dates that do not exist', () => {
    expect(isValidPeriod({ start: '2026-05-01', end: '2026-04-30' })).toBe(
      false,
    )
    expect(isValidPeriod({ start: '2026-02-30', end: null })).toBe(false)
    expect(isValidPeriod({ start: '2026-05-01', end: '2026-02-30' })).toBe(
      false,
    )
  })
})

describe('todayUtc', () => {
  it('returns the UTC calendar date', () => {
    expect(todayUtc(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-10')
    expect(todayUtc(new Date('2026-11-11T00:30:00Z'))).toBe('2026-11-11')
  })
})

describe('zonedInstant', () => {
  it('reads a wall time in a zone without daylight saving', () => {
    expect(zonedInstant('2027-03-01', '07:00', 'Asia/Jakarta').toISOString()).toBe('2027-03-01T00:00:00.000Z')
    expect(zonedInstant('2027-03-01', '07:00', 'Asia/Makassar').toISOString()).toBe('2027-02-28T23:00:00.000Z')
    expect(zonedInstant('2027-03-01', '07:00', 'Asia/Jayapura').toISOString()).toBe('2027-02-28T22:00:00.000Z')
    expect(zonedInstant('2027-03-01', '07:00', 'Pacific/Kiritimati').toISOString()).toBe('2027-02-28T17:00:00.000Z')
    expect(zonedInstant('2027-03-01', '00:00', 'UTC').toISOString()).toBe('2027-03-01T00:00:00.000Z')
  })

  it('follows the offset of the day in a zone with daylight saving', () => {
    expect(zonedInstant('2027-03-13', '12:00', 'America/New_York').toISOString()).toBe('2027-03-13T17:00:00.000Z')
    expect(zonedInstant('2027-03-15', '12:00', 'America/New_York').toISOString()).toBe('2027-03-15T16:00:00.000Z')
    expect(zonedInstant('2027-03-14', '01:30', 'America/New_York').toISOString()).toBe('2027-03-14T06:30:00.000Z')
    expect(zonedInstant('2027-03-14', '03:30', 'America/New_York').toISOString()).toBe('2027-03-14T07:30:00.000Z')
    expect(zonedInstant('2027-11-07', '12:00', 'America/New_York').toISOString()).toBe('2027-11-07T17:00:00.000Z')
    expect(zonedInstant('2027-11-06', '12:00', 'America/New_York').toISOString()).toBe('2027-11-06T16:00:00.000Z')
  })

  it('makes a night shift across the change the right length', () => {
    const start = zonedInstant('2027-03-13', '21:00', 'America/New_York')
    const end = zonedInstant('2027-03-14', '07:00', 'America/New_York')
    expect((end.getTime() - start.getTime()) / 3600000).toBe(9)
  })

  it('answers some instant for a wall time that does not exist and one that happens twice, near the right moment', () => {
    const skipped = zonedInstant('2027-03-14', '02:30', 'America/New_York').getTime()
    expect(Math.abs(skipped - Date.parse('2027-03-14T07:00:00Z'))).toBeLessThanOrEqual(3600000)
    const twice = zonedInstant('2027-11-07', '01:30', 'America/New_York').getTime()
    expect(Math.abs(twice - Date.parse('2027-11-07T06:00:00Z'))).toBeLessThanOrEqual(3600000)
  })

  it('works for years before 100 and refuses an unknown zone', () => {
    expect(zonedInstant('0099-01-01', '00:00', 'UTC').getUTCFullYear()).toBe(99)
    expect(() => zonedInstant('2027-03-01', '07:00', 'Mars/Base')).toThrow(RangeError)
  })
})

describe('todayInZone', () => {
  const instant = new Date('2026-03-10T12:00:00Z')

  it('reads the same instant as different dates in different zones', () => {
    expect(todayInZone('Pacific/Kiritimati', instant)).toBe('2026-03-11')
    expect(todayInZone('Pacific/Pago_Pago', instant)).toBe('2026-03-10')
    expect(todayInZone('UTC', instant)).toBe('2026-03-10')
  })

  it('crosses midnight in Jakarta at 17:00 UTC', () => {
    expect(todayInZone('Asia/Jakarta', new Date('2026-03-10T16:59:59Z'))).toBe(
      '2026-03-10',
    )
    expect(todayInZone('Asia/Jakarta', new Date('2026-03-10T17:00:00Z'))).toBe(
      '2026-03-11',
    )
  })

  it('rejects a name that is not a time zone', () => {
    expect(() => todayInZone('Mars/Base', instant)).toThrow(RangeError)
  })
})
