import { InvalidRequestError } from '../workforce.error'
import {
  OPEN_STATUSES,
  assertTransition,
  checkRequestDates,
  needsSecondStep,
  type DatePolicy,
} from './leave-request-rules'
import { type LeaveRequestStatus } from '@repository/model/leave-request'

/**
 * Runs a check and returns the code of the rejection.
 *
 * @param work - The check.
 * @returns The workforce code, or `null` when the check passes.
 */
function codeOf(work: () => void): string | null {
  try {
    work()
    return null
  } catch (error: unknown) {
    if (error instanceof InvalidRequestError) {
      return error.code
    }
    throw error
  }
}

describe('assertTransition', () => {
  const statuses: LeaveRequestStatus[] = ['requested', 'head_approved', 'approved', 'rejected', 'cancelled']
  const allowed: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
    requested: ['head_approved', 'approved', 'rejected', 'cancelled'],
    head_approved: ['approved', 'rejected', 'cancelled'],
    approved: ['cancelled'],
    rejected: [],
    cancelled: [],
  }

  it.each(statuses.flatMap((from) => statuses.map((to) => [from, to] as const)))('%s to %s', (from, to) => {
    const expected = allowed[from].includes(to) ? null : 'invalid_transition'

    expect(codeOf(() => assertTransition(from, to))).toBe(expected)
  })

  it('names the statuses whose days and dates count as taken', () => {
    expect(OPEN_STATUSES).toEqual(['requested', 'head_approved', 'approved'])
  })
})

describe('needsSecondStep', () => {
  it('is true for a two-step policy, and for a one-step policy only above its threshold', () => {
    expect(needsSecondStep({ steps: 'two_step', two_step_above_days: null }, 1)).toBe(true)
    expect(needsSecondStep({ steps: 'one_step', two_step_above_days: null }, 30)).toBe(false)
    expect(needsSecondStep({ steps: 'one_step', two_step_above_days: 5 }, 5)).toBe(false)
    expect(needsSecondStep({ steps: 'one_step', two_step_above_days: 5 }, 6)).toBe(true)
  })
})

describe('checkRequestDates', () => {
  const today = '2026-11-19'
  const policy: DatePolicy = { noticeDays: 0, retroactiveDays: 0, halfDays: true }
  const check = (override: Partial<Parameters<typeof checkRequestDates>[0]> = {}, over: Partial<DatePolicy> = {}) =>
    codeOf(() =>
      checkRequestDates({
        start: '2026-12-01',
        end: '2026-12-03',
        halfDays: { first: false, last: false },
        policy: { ...policy, ...over },
        today,
        ...override,
      }),
    )

  it('accepts a period in the future, and a one-day period', () => {
    expect(check()).toBeNull()
    expect(check({ end: '2026-12-01' })).toBeNull()
  })

  it.each([
    ['2026-02-30', '2026-03-01'],
    ['2026-12-03', '2026-12-01'],
    ['soon', '2026-12-03'],
  ])('refuses the period %s to %s (invalid_period)', (start, end) => {
    expect(check({ start, end })).toBe('invalid_period')
  })

  it('allows a period of 366 days and refuses one of 367 (period_too_long)', () => {
    expect(check({ start: '2027-01-01', end: '2027-12-31' }, { halfDays: true })).toBeNull()
    expect(check({ start: '2028-01-01', end: '2028-12-31' })).toBeNull()
    expect(check({ start: '2027-01-01', end: '2028-01-02' })).toBe('period_too_long')
  })

  it('needs the notice before the first day when no after-the-fact days are allowed', () => {
    expect(check({ start: '2026-11-19', end: '2026-11-19' })).toBeNull()
    expect(check({ start: '2026-11-18', end: '2026-11-19' })).toBe('notice_too_short')
    expect(check({ start: '2026-11-25', end: '2026-11-26' }, { noticeDays: 7 })).toBe('notice_too_short')
    expect(check({ start: '2026-11-26', end: '2026-11-27' }, { noticeDays: 7 })).toBeNull()
  })

  it('accepts a first day up to the after-the-fact days in the past, and refuses an earlier one (too_late)', () => {
    expect(check({ start: '2026-11-16', end: '2026-11-17' }, { retroactiveDays: 3 })).toBeNull()
    expect(check({ start: '2026-11-15', end: '2026-11-17' }, { retroactiveDays: 3 })).toBe('too_late')
    expect(check({ start: '2026-12-01', end: '2026-12-02' }, { retroactiveDays: 3, noticeDays: 30 })).toBeNull()
  })

  it('allows half days only when the policy does, and not both halves of a single day', () => {
    expect(check({ halfDays: { first: true, last: false } }, { halfDays: false })).toBe('half_day_not_allowed')
    expect(check({ halfDays: { first: false, last: true } })).toBeNull()
    expect(check({ end: '2026-12-01', halfDays: { first: true, last: true } })).toBe('invalid_half_days')
    expect(check({ end: '2026-12-01', halfDays: { first: true, last: false } })).toBeNull()
  })
})
