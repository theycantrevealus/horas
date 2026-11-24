import { InvalidRequestError } from '../workforce.error'
import { checkLastWorkingDay, checkNoticeDate, checkReason } from './separation-rules'

/**
 * Captures the code of the error a call throws.
 *
 * @param work - The call.
 * @returns The code, or `null` when nothing was thrown.
 */
function codeOf(work: () => void): string | null {
  try {
    work()
  } catch (thrown: unknown) {
    return (thrown as InvalidRequestError).code
  }
  return null
}

describe('separation rules', () => {
  it('trims a reason and refuses an empty or too long one', () => {
    expect(checkReason('  Pindah  ', 1000)).toBe('Pindah')
    expect(codeOf(() => checkReason('   ', 1000))).toBe('reason_required')
    expect(codeOf(() => checkReason(undefined, 1000))).toBe('reason_required')
    expect(codeOf(() => checkReason('x'.repeat(501), 500))).toBe('invalid_reason')
    expect(codeOf(() => checkReason('x'.repeat(500), 500))).toBeNull()
  })

  it('accepts today or later for a planned separation and refuses the past, a bad date and a date before the hire', () => {
    expect(codeOf(() => checkLastWorkingDay('2026-11-23', '2026-11-23', false, '2020-01-01'))).toBeNull()
    expect(codeOf(() => checkLastWorkingDay('2026-11-22', '2026-11-23', false, '2020-01-01'))).toBe('invalid_last_working_day')
    expect(codeOf(() => checkLastWorkingDay('2026-02-30', '2026-11-23', false, '2020-01-01'))).toBe('invalid_last_working_day')
    expect(codeOf(() => checkLastWorkingDay(undefined, '2026-11-23', false, '2020-01-01'))).toBe('invalid_last_working_day')
    expect(codeOf(() => checkLastWorkingDay('2019-12-31', '2026-11-23', true, '2020-01-01'))).toBe('invalid_last_working_day')
  })

  it('lets an immediate separation name today or a past date, and refuses a future one', () => {
    expect(codeOf(() => checkLastWorkingDay('2026-11-01', '2026-11-23', true, '2020-01-01'))).toBeNull()
    expect(codeOf(() => checkLastWorkingDay('2026-11-23', '2026-11-23', true, '2020-01-01'))).toBeNull()
    expect(codeOf(() => checkLastWorkingDay('2026-11-24', '2026-11-23', true, '2020-01-01'))).toBe('invalid_last_working_day')
  })

  it('accepts a missing notice date and one not after the last working day, and refuses the others', () => {
    expect(codeOf(() => checkNoticeDate(null, '2026-12-31'))).toBeNull()
    expect(codeOf(() => checkNoticeDate('2026-12-31', '2026-12-31'))).toBeNull()
    expect(codeOf(() => checkNoticeDate('2027-01-01', '2026-12-31'))).toBe('invalid_notice_date')
    expect(codeOf(() => checkNoticeDate('soon', '2026-12-31'))).toBe('invalid_notice_date')
  })
})
