import { BUNDLES } from '../concept/bundles'
import { checkPolicyInput, type LeavePolicyInput } from './leave-policy-rules'
import { findPolicyBundle, LEAVE_POLICY_BUNDLES } from './policy-bundles'

const mitra = { system: 'id.employment-type', code: 'mitra' }

describe('leave policy bundles', () => {
  const policies = findPolicyBundle('id') ?? []
  const byCode = (code: string) =>
    policies.find((policy) => policy.leave_type.code === code)

  it('knows the Indonesian bundle and nothing else yet', () => {
    expect(Object.keys(LEAVE_POLICY_BUNDLES)).toEqual(['id'])
    expect(findPolicyBundle('xx')).toBeUndefined()
    expect(findPolicyBundle('constructor')).toBeUndefined()
    expect(findPolicyBundle('__proto__')).toBeUndefined()
  })

  it('has one policy for each of the 13 leave type codes of the concept bundle', () => {
    const codes = (BUNDLES.id ?? [])
      .filter((concept) => concept.system === 'id.leave-type')
      .map((concept) => concept.code)
      .sort()
    expect(policies.map((policy) => policy.leave_type.code).sort()).toEqual(codes)
    expect(codes).toHaveLength(13)
    expect(policies.every((policy) => policy.leave_type.system === 'id.leave-type')).toBe(true)
  })

  it('gives every policy a value that passes the policy rules', () => {
    for (const policy of policies) {
      const input: LeavePolicyInput = {
        balance:
          policy.balance.kind === 'period'
            ? {
                kind: 'period',
                period: policy.balance.period,
                days: policy.balance.days,
                minServiceMonths: policy.balance.min_service_months,
                carryOver: policy.balance.carry_over
                  ? {
                      maxDays: policy.balance.carry_over.max_days,
                      expiresAfterMonths: policy.balance.carry_over.expires_after_months,
                    }
                  : null,
                deductCollectiveLeave: policy.balance.deduct_collective_leave,
              }
            : policy.balance,
        counting: policy.counting,
        halfDays: policy.half_days,
        paid: policy.paid,
        employmentTypes: policy.employment_types,
        approval: {
          steps: policy.approval.steps,
          twoStepAboveDays: policy.approval.two_step_above_days,
        },
        noticeDays: policy.notice_days,
        retroactiveDays: policy.retroactive_days,
        maxDaysPerRequest: policy.max_days_per_request,
        proof: policy.proof ? { dueDays: policy.proof.due_days } : null,
        notes: policy.notes,
      }
      expect(() => checkPolicyInput(input), policy.leave_type.code).not.toThrow()
    }
  })

  it('makes tahunan a service-year entitlement of 12 days after 12 months, one step, no carry-over, no collective leave', () => {
    expect(byCode('tahunan')).toMatchObject({
      balance: {
        kind: 'period',
        period: 'service_year',
        days: 12,
        min_service_months: 12,
        carry_over: null,
        deduct_collective_leave: false,
      },
      counting: 'working_days',
      approval: { steps: 'one_step' },
      retroactive_days: 0,
      proof: null,
    })
  })

  it('makes sakit a balance-free leave with a note due in 3 days, requestable 3 days late', () => {
    expect(byCode('sakit')).toMatchObject({
      balance: { kind: 'none' },
      counting: 'working_days',
      retroactive_days: 3,
      proof: { due_days: 3 },
      approval: { steps: 'one_step' },
    })
  })

  it('makes maternity and miscarriage leave calendar-day, two-step events', () => {
    expect(byCode('melahirkan')).toMatchObject({
      balance: { kind: 'per_event', days: 90 },
      counting: 'calendar_days',
      approval: { steps: 'two_step' },
    })
    expect(byCode('keguguran')).toMatchObject({
      balance: { kind: 'per_event', days: 45 },
      counting: 'calendar_days',
      retroactive_days: 3,
    })
  })

  it('gives the special leaves the days of HR spec 9.4.8', () => {
    const days = (code: string) => {
      const balance = byCode(code)?.balance
      return balance?.kind === 'per_event' ? balance.days : null
    }
    expect(days('menikah')).toBe(3)
    expect(days('menikahkan_anak')).toBe(2)
    expect(days('khitan_baptis_anak')).toBe(2)
    expect(days('istri_melahirkan')).toBe(2)
    expect(days('duka_keluarga')).toBe(2)
    expect(days('duka_serumah')).toBe(1)
  })

  it('makes unpaid leave two-step and unpaid, and menstrual leave requestable one day late', () => {
    expect(byCode('tanpa_upah')).toMatchObject({
      balance: { kind: 'none' },
      paid: false,
      approval: { steps: 'two_step' },
    })
    expect(byCode('haid')).toMatchObject({ balance: { kind: 'none' }, retroactive_days: 1 })
  })

  it('allows tidak_tersedia only for mitra and excludes mitra from every other policy', () => {
    expect(byCode('tidak_tersedia')?.employment_types).toEqual([mitra])
    for (const policy of policies.filter((item) => item.leave_type.code !== 'tidak_tersedia')) {
      expect(policy.employment_types.map((type) => type.code).sort()).toEqual(['intern', 'pkwt', 'pkwtt'])
    }
  })
})
