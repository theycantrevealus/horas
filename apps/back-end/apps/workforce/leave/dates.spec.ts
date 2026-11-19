import { addMonths, wholeMonthsBetween } from './dates'

describe('addMonths', () => {
  it.each([
    ['2027-01-15', 1, '2027-02-15'],
    ['2027-01-31', 1, '2027-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-11-30', 3, '2027-02-28'],
    ['2024-02-29', 12, '2025-02-28'],
    ['2024-02-29', 48, '2028-02-29'],
    ['2026-03-15', 0, '2026-03-15'],
    ['2026-03-15', -3, '2025-12-15'],
    ['2026-12-31', 2, '2027-02-28'],
  ])('adds months to %s: %i gives %s, a day that does not exist moves to the last day of the month', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected)
  })
})

describe('wholeMonthsBetween', () => {
  it.each([
    ['2026-01-15', '2027-01-14', 11],
    ['2026-01-15', '2027-01-15', 12],
    ['2026-01-31', '2026-02-28', 1],
    ['2024-02-29', '2025-02-28', 12],
    ['2026-03-01', '2026-03-01', 0],
    ['2026-03-01', '2026-03-31', 0],
    ['2026-03-15', '2026-03-14', 0],
  ])('counts the whole months from %s to %s as %i', (from, to, expected) => {
    expect(wholeMonthsBetween(from, to)).toBe(expected)
  })
})
