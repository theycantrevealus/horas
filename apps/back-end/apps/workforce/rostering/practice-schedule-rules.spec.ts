import {
  areSessionTimes,
  firstSessionDate,
  isDayOfWeek,
  isoWeekday,
  isQuota,
  isSchedulePeriod,
  periodsShareDays,
  sessionsOverlap,
} from './practice-schedule-rules'

describe('practice schedule rules', () => {
  it('accepts the ISO weekdays 1 to 7 only', () => {
    for (const day of [1, 4, 7]) {
      expect(isDayOfWeek(day)).toBe(true)
    }
    for (const day of [0, 8, 1.5, '1', null, undefined]) {
      expect(isDayOfWeek(day)).toBe(false)
    }
  })

  it('accepts a quota that is a whole number from 1 to 9999', () => {
    for (const quota of [1, 30, 9999]) {
      expect(isQuota(quota)).toBe(true)
    }
    for (const quota of [0, -1, 10000, 2.5, '5', NaN]) {
      expect(isQuota(quota)).toBe(false)
    }
  })

  it('needs real local times with the end after the start on the same day', () => {
    expect(areSessionTimes('08:00', '12:00')).toBe(true)
    expect(areSessionTimes('00:00', '23:59')).toBe(true)
    for (const [start, end] of [['12:00', '08:00'], ['08:00', '08:00'], ['21:00', '07:00'], ['8:00', '12:00'], ['08:00', '24:00'], ['08:00', 'noon']] as const) {
      expect(areSessionTimes(start, end)).toBe(false)
    }
  })

  it('needs a real start from 2000-01-01 and an end that is empty or not before it', () => {
    expect(isSchedulePeriod({ start: '2099-03-01', end: null })).toBe(true)
    expect(isSchedulePeriod({ start: '2099-03-01', end: '2099-03-01' })).toBe(true)
    expect(isSchedulePeriod({ start: '2099-03-02', end: '2099-03-01' })).toBe(false)
    expect(isSchedulePeriod({ start: '1999-12-31', end: null })).toBe(false)
    expect(isSchedulePeriod({ start: '2099-02-30', end: null })).toBe(false)
    expect(isSchedulePeriod({ start: '2099-03-01', end: 'soon' })).toBe(false)
  })

  it('reads the ISO weekday of a date', () => {
    expect(isoWeekday('2099-03-02')).toBe(1)
    expect(isoWeekday('2099-03-08')).toBe(7)
    expect(isoWeekday('2099-03-07')).toBe(6)
  })

  it('finds the first session date from today or the start, inside the period', () => {
    // 2099-03-02 is a Monday.
    expect(firstSessionDate(1, { start: '2099-03-01', end: null }, '2099-01-01')).toBe('2099-03-02')
    expect(firstSessionDate(1, { start: '2099-03-01', end: null }, '2099-03-02')).toBe('2099-03-02')
    expect(firstSessionDate(1, { start: '2099-03-01', end: null }, '2099-03-03')).toBe('2099-03-09')
    expect(firstSessionDate(5, { start: '2099-03-01', end: '2099-03-31' }, '2099-03-01')).toBe('2099-03-06')
    expect(firstSessionDate(1, { start: '2099-03-03', end: '2099-03-05' }, '2099-03-01')).toBeNull()
    expect(firstSessionDate(1, { start: '2099-03-01', end: '2099-03-31' }, '2099-04-01')).toBeNull()
  })

  it('tells when two periods share a day, an empty end being open-ended', () => {
    expect(periodsShareDays({ start: '2099-03-01', end: '2099-03-31' }, { start: '2099-03-31', end: null })).toBe(true)
    expect(periodsShareDays({ start: '2099-03-01', end: '2099-03-30' }, { start: '2099-03-31', end: null })).toBe(false)
    expect(periodsShareDays({ start: '2099-03-01', end: null }, { start: '2099-01-01', end: null })).toBe(true)
  })

  it('tells when two sessions overlap, touching sessions not counting', () => {
    expect(sessionsOverlap({ start: '08:00', end: '12:00' }, { start: '11:00', end: '14:00' })).toBe(true)
    expect(sessionsOverlap({ start: '08:00', end: '12:00' }, { start: '09:00', end: '10:00' })).toBe(true)
    expect(sessionsOverlap({ start: '08:00', end: '12:00' }, { start: '12:00', end: '14:00' })).toBe(false)
    expect(sessionsOverlap({ start: '12:00', end: '14:00' }, { start: '08:00', end: '12:00' })).toBe(false)
  })
})
