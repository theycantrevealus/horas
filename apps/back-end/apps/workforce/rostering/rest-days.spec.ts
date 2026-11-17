import { findMissingRestDays } from './rest-days'

const days = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => `2099-03-${String(start + index).padStart(2, '0')}`)
const march = { start: '2099-03-01', end: '2099-03-31' }

describe('findMissingRestDays', () => {
  it('accepts a rest day in every 7 days, whether a day off or no shift at all', () => {
    // Works six days, rests the seventh, over and over.
    const work = new Set(['2099-03-01', '2099-03-02', '2099-03-03', '2099-03-04', '2099-03-05', '2099-03-06', '2099-03-08', '2099-03-09', '2099-03-10', '2099-03-11', '2099-03-12', '2099-03-13'])
    expect(findMissingRestDays(work, march)).toEqual([])
    expect(findMissingRestDays(new Set(), march)).toEqual([])
  })

  it('reports 7 days in a row without a rest day, once per run', () => {
    expect(findMissingRestDays(new Set(days(1, 7)), march)).toEqual(['2099-03-07'])
    expect(findMissingRestDays(new Set(days(1, 10)), march)).toEqual(['2099-03-07'])
    expect(findMissingRestDays(new Set([...days(1, 8), ...days(10, 20)]), march)).toEqual(['2099-03-07', '2099-03-16'])
  })

  it('does not report 6 days in a row', () => {
    expect(findMissingRestDays(new Set(days(1, 6)), march)).toEqual([])
  })

  it('counts days before the period, from other rosters, in a window that ends inside it', () => {
    const before = ['2099-02-24', '2099-02-25', '2099-02-26', '2099-02-27', '2099-02-28', '2099-03-01', '2099-03-02']
    expect(findMissingRestDays(new Set(before), march)).toEqual(['2099-03-02'])
    expect(findMissingRestDays(new Set(before.slice(0, 5)), march)).toEqual([])
  })

  it('does not report a window that ends after the period', () => {
    expect(findMissingRestDays(new Set(days(25, 31)), { start: '2099-03-01', end: '2099-03-31' })).toEqual(['2099-03-31'])
    expect(findMissingRestDays(new Set(days(25, 31)), { start: '2099-03-01', end: '2099-03-30' })).toEqual([])
  })
})
