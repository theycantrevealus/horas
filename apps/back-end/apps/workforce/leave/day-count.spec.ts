import { countDays, totalOf, type CountDaysInput } from './day-count'

/**
 * Builds the input of a count with the defaults of an office week and no roster.
 *
 * @param override - Fields that replace the defaults.
 * @returns The input.
 */
function input(override: Partial<CountDaysInput> = {}): CountDaysInput {
  return {
    counting: 'working_days',
    start: '2027-03-01',
    end: '2027-03-07',
    halfDays: { first: false, last: false },
    rosterDays: new Map(),
    workingWeek: [1, 2, 3, 4, 5],
    holidays: new Map(),
    ...override,
  }
}

/**
 * @param days - The counted days.
 * @returns Each date with its count, why and source.
 */
function summary(days: ReturnType<typeof countDays>) {
  return days.map((day) => [day.date, day.count, day.why, day.set_by])
}

describe('countDays', () => {
  // 2027-03-01 is a Monday.
  it('counts the days a ward nurse is rostered: Monday to Saturday on shift and Sunday off is 6', () => {
    const rosterDays = new Map<string, boolean>()
    for (const date of ['2027-03-01', '2027-03-02', '2027-03-03', '2027-03-04', '2027-03-05', '2027-03-06']) {
      rosterDays.set(date, true)
    }
    rosterDays.set('2027-03-07', false)

    const days = countDays(input({ rosterDays }))

    expect(totalOf(days)).toBe(6)
    expect(days.at(-1)).toEqual({ date: '2027-03-07', count: 0, why: 'rest_day', set_by: 'roster' })
    expect(days[0]).toEqual({ date: '2027-03-01', count: 1, why: 'working', set_by: 'roster' })
  })

  it('counts an office week from the working week, minus the public holiday and the collective leave day: 3', () => {
    const holidays = new Map<string, 'public' | 'local' | 'collective_leave'>([
      ['2027-03-03', 'public'],
      ['2027-03-04', 'collective_leave'],
    ])

    const days = countDays(input({ holidays }))

    expect(summary(days)).toEqual([
      ['2027-03-01', 1, 'working', 'working_week'],
      ['2027-03-02', 1, 'working', 'working_week'],
      ['2027-03-03', 0, 'holiday', 'working_week'],
      ['2027-03-04', 0, 'collective_leave', 'working_week'],
      ['2027-03-05', 1, 'working', 'working_week'],
      ['2027-03-06', 0, 'rest_day', 'working_week'],
      ['2027-03-07', 0, 'rest_day', 'working_week'],
    ])
    expect(totalOf(days)).toBe(3)
  })

  it('treats a local holiday like a public one and follows the working week of the facility', () => {
    const days = countDays(input({ workingWeek: [1, 2, 3, 4, 5, 6], holidays: new Map([['2027-03-02', 'local' as const]]) }))

    expect(summary(days).filter(([, , why]) => why === 'holiday')).toEqual([['2027-03-02', 0, 'holiday', 'working_week']])
    expect(totalOf(days)).toBe(5)
  })

  it('lets a roster decide the dates it covers and the working week the others, a holiday included', () => {
    const rosterDays = new Map<string, boolean>([['2027-03-02', true], ['2027-03-03', false]])
    const holidays = new Map<string, 'public' | 'local' | 'collective_leave'>([['2027-03-02', 'public'], ['2027-03-05', 'public']])

    const days = countDays(input({ end: '2027-03-05', rosterDays, holidays }))

    expect(summary(days)).toEqual([
      ['2027-03-01', 1, 'working', 'working_week'],
      ['2027-03-02', 1, 'working', 'roster'],
      ['2027-03-03', 0, 'rest_day', 'roster'],
      ['2027-03-04', 1, 'working', 'working_week'],
      ['2027-03-05', 0, 'holiday', 'working_week'],
    ])
  })

  it('counts a half first day or a half last day 0.5 on a date that counts, and still 0 on one that does not', () => {
    const half = countDays(input({ end: '2027-03-03', halfDays: { first: true, last: true } }))
    const onRestDay = countDays(input({ start: '2027-03-06', end: '2027-03-08', halfDays: { first: true, last: false } }))

    expect(half.map((day) => day.count)).toEqual([0.5, 1, 0.5])
    expect(totalOf(half)).toBe(2)
    expect(onRestDay.map((day) => day.count)).toEqual([0, 0, 1])
  })

  it('counts a one-day request with a half day as half a day', () => {
    const [day] = countDays(input({ end: '2027-03-01', halfDays: { first: true, last: false } }))

    expect(day).toMatchObject({ date: '2027-03-01', count: 0.5 })
  })

  it('counts every date for calendar days, 90 days giving 90, ignoring the roster, the week and the holidays', () => {
    const days = countDays(
      input({
        counting: 'calendar_days',
        start: '2027-01-01',
        end: '2027-03-31',
        rosterDays: new Map([['2027-01-03', false]]),
        holidays: new Map([['2027-01-01', 'public' as const]]),
      }),
    )

    expect(days).toHaveLength(90)
    expect(totalOf(days)).toBe(90)
    expect(days[0]).toEqual({ date: '2027-01-01', count: 1, why: 'calendar_day', set_by: 'policy' })
  })

  it('applies a half day to calendar days too, and handles month and year ends and a leap day', () => {
    const days = countDays(input({ counting: 'calendar_days', start: '2028-02-27', end: '2028-03-01', halfDays: { first: false, last: true } }))

    expect(days.map((day) => [day.date, day.count])).toEqual([['2028-02-27', 1], ['2028-02-28', 1], ['2028-02-29', 1], ['2028-03-01', 0.5]])
    expect(countDays(input({ counting: 'calendar_days', start: '2026-12-31', end: '2027-01-01' })).map((day) => day.date)).toEqual(['2026-12-31', '2027-01-01'])
  })

  it('numbers Sunday as ISO weekday 7', () => {
    const days = countDays(input({ start: '2027-03-07', end: '2027-03-07', workingWeek: [7] }))

    expect(days[0]).toMatchObject({ count: 1, why: 'working' })
  })
})

describe('totalOf', () => {
  it('sums in exact half days', () => {
    const days = Array.from({ length: 25 }, (_, index) => ({ date: `2027-01-${String(index + 1).padStart(2, '0')}`, count: 0.5 as const, why: 'working' as const, set_by: 'policy' as const }))

    expect(totalOf(days)).toBe(12.5)
    expect(totalOf([])).toBe(0)
  })
})
