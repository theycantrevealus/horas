import { isInPeriod, isRosterRole, shiftInstants } from './roster-assignment-rules'

describe('assignment rules', () => {
  it('knows the four roles', () => {
    for (const role of ['staff', 'team_leader', 'supervisor', 'dpjp_on_call']) {
      expect(isRosterRole(role)).toBe(true)
    }
    expect(isRosterRole('boss')).toBe(false)
  })

  it('tells whether a date is in a period, both ends included', () => {
    const march = { start: '2027-03-01', end: '2027-03-31' }
    expect(isInPeriod('2027-03-01', march)).toBe(true)
    expect(isInPeriod('2027-03-31', march)).toBe(true)
    expect(isInPeriod('2027-02-28', march)).toBe(false)
    expect(isInPeriod('2027-04-01', march)).toBe(false)
  })

  it('computes the instants of a day shift and of an overnight shift in the facility zone', () => {
    const day = shiftInstants('2027-03-10', { type: 'regular', start_time: '07:00', end_time: '14:00' }, 'Asia/Jakarta')
    expect(day.startsAt?.toISOString()).toBe('2027-03-10T00:00:00.000Z')
    expect(day.endsAt?.toISOString()).toBe('2027-03-10T07:00:00.000Z')
    const night = shiftInstants('2027-03-10', { type: 'regular', start_time: '21:00', end_time: '07:00' }, 'Asia/Jakarta')
    expect(night.startsAt?.toISOString()).toBe('2027-03-10T14:00:00.000Z')
    expect(night.endsAt?.toISOString()).toBe('2027-03-11T00:00:00.000Z')
    const monthEnd = shiftInstants('2027-03-31', { type: 'on_call_remote', start_time: '20:00', end_time: '08:00' }, 'Asia/Makassar')
    expect(monthEnd.endsAt?.toISOString()).toBe('2027-04-01T00:00:00.000Z')
  })

  it('answers no instants for a day off, and follows the clocks in a zone with daylight saving', () => {
    expect(shiftInstants('2027-03-10', { type: 'off', start_time: null, end_time: null }, 'Asia/Jakarta')).toEqual({ startsAt: null, endsAt: null })
    const night = shiftInstants('2027-03-13', { type: 'regular', start_time: '21:00', end_time: '07:00' }, 'America/New_York')
    expect(((night.endsAt?.getTime() ?? 0) - (night.startsAt?.getTime() ?? 0)) / 3_600_000).toBe(9)
  })
})
