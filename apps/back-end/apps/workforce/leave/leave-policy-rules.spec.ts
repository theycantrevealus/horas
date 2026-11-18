import { InvalidRequestError } from '../workforce.error'
import {
  checkPolicyInput,
  type LeavePolicyInput,
} from './leave-policy-rules'

/**
 * An annual leave policy that passes every rule.
 */
const annual: LeavePolicyInput = {
  balance: {
    kind: 'period',
    period: 'service_year',
    days: 12,
    minServiceMonths: 12,
    carryOver: null,
    deductCollectiveLeave: false,
  },
  counting: 'working_days',
  halfDays: true,
  paid: true,
  employmentTypes: [{ system: 'id.employment-type', code: 'pkwtt' }],
  approval: { steps: 'one_step', twoStepAboveDays: null },
  noticeDays: 0,
  retroactiveDays: 0,
  maxDaysPerRequest: 12,
  proof: null,
  notes: null,
}

/**
 * Runs the rules and returns the code of the rejection.
 *
 * @param change - Fields that replace those of the annual policy.
 * @returns The workforce code, or `null` when the input is accepted.
 */
function codeOf(change: Partial<LeavePolicyInput>): string | null {
  try {
    checkPolicyInput({ ...annual, ...change })
    return null
  } catch (error: unknown) {
    if (error instanceof InvalidRequestError) {
      return error.code
    }
    throw error
  }
}

describe('checkPolicyInput', () => {
  it('accepts an annual policy and returns the stored fields', () => {
    expect(checkPolicyInput(annual)).toEqual({
      balance: {
        kind: 'period',
        period: 'service_year',
        days: 12,
        min_service_months: 12,
        carry_over: null,
        deduct_collective_leave: false,
      },
      counting: 'working_days',
      half_days: true,
      paid: true,
      employment_types: [{ system: 'id.employment-type', code: 'pkwtt' }],
      approval: { steps: 'one_step', two_step_above_days: null },
      notice_days: 0,
      retroactive_days: 0,
      max_days_per_request: 12,
      proof: null,
      notes: null,
    })
  })

  it('accepts a carry-over, a per-event policy and a policy without a balance', () => {
    expect(
      codeOf({
        balance: {
          ...annual.balance,
          carryOver: { maxDays: 6, expiresAfterMonths: 6 },
        },
      }),
    ).toBeNull()
    expect(
      codeOf({
        balance: { kind: 'per_event', days: 2.5 },
        maxDaysPerRequest: 2.5,
      }),
    ).toBeNull()
    expect(codeOf({ balance: { kind: 'none' } })).toBeNull()
  })

  it.each([
    ['days not in half steps', { ...annual.balance, days: 0.25 }],
    ['days zero', { ...annual.balance, days: 0 }],
    ['days above 366', { ...annual.balance, days: 367 }],
    ['an unknown period', { ...annual.balance, period: 'lunar_year' }],
    ['minimum service above 120 months', { ...annual.balance, minServiceMonths: 121 }],
    ['a fractional minimum service', { ...annual.balance, minServiceMonths: 1.5 }],
    [
      'a carry-over larger than the entitlement',
      { ...annual.balance, carryOver: { maxDays: 13, expiresAfterMonths: 6 } },
    ],
    [
      'a carry-over that expires after 25 months',
      { ...annual.balance, carryOver: { maxDays: 6, expiresAfterMonths: 25 } },
    ],
    ['an unknown kind', { kind: 'forever' }],
    ['a period-only setting on a per-event policy', { kind: 'per_event', days: 3, carryOver: null }],
    ['a collective-leave setting on a per-event policy', { kind: 'per_event', days: 3, deductCollectiveLeave: true }],
    ['days on a policy without a balance', { kind: 'none', days: 3 }],
  ])('refuses a balance with %s (invalid_balance)', (_name, balance) => {
    expect(
      codeOf({ balance, maxDaysPerRequest: balance.kind === 'per_event' ? 3 : 12 }),
    ).toBe('invalid_balance')
  })

  it('refuses a counting that is neither working nor calendar days', () => {
    expect(codeOf({ counting: 'fortnights' })).toBe('invalid_counting')
  })

  it.each([0, 367, 0.3])('refuses %s days per request', (days) => {
    expect(codeOf({ maxDaysPerRequest: days })).toBe('invalid_max_days')
  })

  it('makes the per-request limit of a per-event policy equal its days', () => {
    expect(
      codeOf({ balance: { kind: 'per_event', days: 3 }, maxDaysPerRequest: 5 }),
    ).toBe('invalid_max_days')
  })

  it('refuses employment types of the wrong system, repeats and more than 20', () => {
    expect(
      codeOf({ employmentTypes: [{ system: 'id.profession', code: 'perawat' }] }),
    ).toBe('invalid_employment_type')
    expect(
      codeOf({
        employmentTypes: [
          { system: 'id.employment-type', code: 'pkwt' },
          { system: 'id.employment-type', code: 'pkwt' },
        ],
      }),
    ).toBe('duplicate_employment_type')
    expect(
      codeOf({
        employmentTypes: Array.from({ length: 21 }, (_, index) => ({
          system: 'id.employment-type',
          code: `type${index}`,
        })),
      }),
    ).toBe('invalid_employment_type')
  })

  it('refuses a two-step threshold on a two-step policy or outside 0.5 to 366', () => {
    expect(
      codeOf({ approval: { steps: 'two_step', twoStepAboveDays: 5 } }),
    ).toBe('invalid_approval')
    expect(
      codeOf({ approval: { steps: 'one_step', twoStepAboveDays: 0 } }),
    ).toBe('invalid_approval')
    expect(
      codeOf({ approval: { steps: 'one_step', twoStepAboveDays: 5 } }),
    ).toBeNull()
    expect(codeOf({ approval: { steps: 'three_step', twoStepAboveDays: null } })).toBe(
      'invalid_approval',
    )
  })

  it('refuses notice, retroactive days and proof out of range', () => {
    expect(codeOf({ noticeDays: 366 })).toBe('invalid_notice')
    expect(codeOf({ noticeDays: -1 })).toBe('invalid_notice')
    expect(codeOf({ retroactiveDays: 31 })).toBe('invalid_retroactive')
    expect(codeOf({ proof: { dueDays: 61 } })).toBe('invalid_proof')
    expect(codeOf({ proof: { dueDays: 3 } })).toBeNull()
  })

  it('refuses notes longer than 500 characters and turns blank notes into null', () => {
    expect(codeOf({ notes: 'x'.repeat(501) })).toBe('invalid_notes')
    expect(checkPolicyInput({ ...annual, notes: '   ' }).notes).toBeNull()
    expect(checkPolicyInput({ ...annual, notes: ' PKB art. 12 ' }).notes).toBe(
      'PKB art. 12',
    )
  })
})
