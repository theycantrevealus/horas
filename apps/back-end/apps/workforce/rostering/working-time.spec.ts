import { checkWorkingTime, weekStart, type WorkingShift, type WorkingTimeLimits } from './working-time'

const limits: WorkingTimeLimits = { minRestHours: 8, maxWeeklyHours: 40, maxOvertimeHoursWeek: 18, maxConsecutiveNights: 3 }

/**
 * Builds a shift from UTC hours of a date.
 *
 * @param date - Local date the shift starts (also the UTC date here).
 * @param from - Start hour.
 * @param to - End hour; past 24 means the next day.
 * @param override - Paid minutes and night flag.
 * @returns The shift.
 */
function shift(date: string, from: number, to: number, override: Partial<WorkingShift> = {}): WorkingShift {
  const day = Date.parse(`${date}T00:00:00Z`)
  return {
    date,
    startsAt: new Date(day + from * 3_600_000),
    endsAt: new Date(day + to * 3_600_000),
    paidMinutes: (to - from) * 60,
    isNight: false,
    ...override,
  }
}

const dayOff = (date: string): WorkingShift => ({ date, startsAt: null, endsAt: null, paidMinutes: 0, isNight: false })

describe('weekStart', () => {
  it('finds the Monday of the week, over month and year ends', () => {
    expect(weekStart('2027-03-01')).toBe('2027-03-01')
    expect(weekStart('2027-03-07')).toBe('2027-03-01')
    expect(weekStart('2027-03-08')).toBe('2027-03-08')
    expect(weekStart('2027-01-01')).toBe('2026-12-28')
    expect(weekStart('2028-03-01')).toBe('2028-02-28')
  })
})

describe('checkWorkingTime', () => {
  it('accepts a shift next to nothing, and a day off beside anything', () => {
    expect(checkWorkingTime(shift('2027-03-02', 7, 14), [], limits, false)).toEqual({ violations: [], overtimeMinutes: 0 })
    expect(checkWorkingTime(dayOff('2027-03-02'), [shift('2027-03-02', 7, 14)], limits, false).violations).toEqual([])
    expect(checkWorkingTime(shift('2027-03-02', 7, 14), [dayOff('2027-03-02')], limits, false).violations).toEqual([])
  })

  it('refuses a shift that overlaps another, even by a minute, and allows one that starts when the other ends only after the rest', () => {
    const other = shift('2027-03-02', 7, 15)
    const overlapping = { ...shift('2027-03-02', 14, 22), startsAt: new Date(other.endsAt!.getTime() - 60_000) }
    expect(checkWorkingTime(overlapping, [other], limits, false).violations).toEqual(['overlap'])
    expect(checkWorkingTime(shift('2027-03-02', 7, 15), [shift('2027-03-02', 7, 15)], limits, false).violations).toEqual(['overlap'])
    expect(checkWorkingTime(shift('2027-03-02', 15, 21), [other], limits, false).violations).toEqual(['rest_too_short'])
  })

  it('needs at least MIN_REST_HOURS between two shifts, exactly the minimum being allowed, in either order', () => {
    const morning = shift('2027-03-02', 7, 15)
    expect(checkWorkingTime(shift('2027-03-02', 22, 30), [morning], limits, false).violations).toEqual(['rest_too_short'])
    expect(checkWorkingTime(shift('2027-03-02', 23, 31), [morning], limits, false).violations).toEqual([])
    expect(checkWorkingTime(shift('2027-03-02', 7, 15), [shift('2027-03-02', 23, 31)], limits, false).violations).toEqual([])
    expect(checkWorkingTime(shift('2027-03-02', 7, 15), [shift('2027-03-02', 22, 30)], limits, false).violations).toEqual(['rest_too_short'])
    expect(checkWorkingTime(shift('2027-03-02', 7, 15), [shift('2027-03-02', 22, 30)], { ...limits, minRestHours: 7 }, false).violations).toEqual([])
  })

  it('counts the paid minutes of the Monday to Sunday week, and overtime needs consent', () => {
    // Four 10-hour shifts Monday to Thursday are 40 hours; a fifth day adds overtime.
    const week = ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04'].map((date) => shift(date, 7, 17))
    const friday = shift('2027-03-05', 7, 15)

    const without = checkWorkingTime(friday, week, limits, false)
    expect(without).toEqual({ violations: ['overtime_consent_required'], overtimeMinutes: 480 })
    const withConsent = checkWorkingTime(friday, week, limits, true)
    expect(withConsent).toEqual({ violations: [], overtimeMinutes: 480 })
    // The next Monday starts a new week.
    expect(checkWorkingTime(shift('2027-03-08', 7, 15), week, limits, false)).toEqual({ violations: [], overtimeMinutes: 0 })
  })

  it('allows exactly MAX_WEEKLY_HOURS without consent and counts only the added overtime', () => {
    const week = ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04'].map((date) => shift(date, 7, 17))
    expect(checkWorkingTime(shift('2027-03-05', 7, 7.0001), week, limits, false).overtimeMinutes).toBeGreaterThanOrEqual(0)
    const exact = [...week.slice(0, 3), shift('2027-03-04', 7, 17)]
    expect(checkWorkingTime(shift('2027-03-06', 7, 7), exact, limits, false)).toEqual({ violations: [], overtimeMinutes: 0 })
    const overtime = [...week, shift('2027-03-05', 7, 15)]
    // Already in overtime: a day off adds none, so it needs no consent.
    expect(checkWorkingTime(dayOff('2027-03-06'), overtime, limits, false)).toEqual({ violations: [], overtimeMinutes: 0 })
  })

  it('refuses overtime above MAX_OVERTIME_HOURS_WEEK, even with consent', () => {
    const base = ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05'].map((date) => shift(date, 7, 17))
    // 50 hours so far: 10 over. A 10-hour shift makes it 20 over, above 18.
    const result = checkWorkingTime(shift('2027-03-06', 7, 17), base, limits, true)
    expect(result.violations).toEqual(['overtime_limit_exceeded'])
    expect(result.overtimeMinutes).toBe(600)
    expect(checkWorkingTime(shift('2027-03-06', 7, 15), base, limits, true).violations).toEqual([])
    expect(checkWorkingTime(shift('2027-03-06', 7, 17), base, limits, false).violations).toEqual(['overtime_consent_required', 'overtime_limit_exceeded'])
  })

  it('limits the run of night shifts and counts the nights on both sides of the new one', () => {
    const night = (date: string) => shift(date, 21, 31, { isNight: true })
    const run = ['2027-03-01', '2027-03-02', '2027-03-03'].map(night)

    expect(checkWorkingTime(night('2027-03-04'), run, limits, false).violations).toEqual(['too_many_nights'])
    expect(checkWorkingTime(night('2027-03-05'), run, limits, false).violations).toEqual([])
    expect(checkWorkingTime(night('2027-03-02'), [night('2027-03-01'), night('2027-03-03'), night('2027-03-04')], limits, false).violations).toEqual(['too_many_nights'])
    expect(checkWorkingTime(night('2027-03-04'), run.slice(1), limits, false).violations).toEqual([])
    expect(checkWorkingTime(shift('2027-03-05', 7, 15), run, limits, false).violations).toEqual([])
  })

  it('reports each broken rule once, in the order overlap or rest, overtime, nights', () => {
    const night = (date: string) => shift(date, 21, 31, { isNight: true })
    const others = [night('2027-03-01'), night('2027-03-02'), night('2027-03-03')]
    const result = checkWorkingTime(night('2027-03-04'), others, { ...limits, maxWeeklyHours: 20 }, false)
    expect(result.violations).toEqual(['overtime_consent_required', 'overtime_limit_exceeded', 'too_many_nights'])
  })
})
