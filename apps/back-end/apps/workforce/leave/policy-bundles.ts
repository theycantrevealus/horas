import { type Coding } from '@repository/model/common/coding'
import { type LeavePolicyFields } from './leave-policy-rules'

/**
 * One policy of a ready-made bundle: the leave type and its rules.
 */
export type BundlePolicy = { leave_type: Coding } & LeavePolicyFields

/**
 * Employment types of the Indonesian bundle that take leave with a balance.
 */
const EMPLOYEES: Coding[] = ['pkwtt', 'pkwt', 'intern'].map((code) => ({
  system: 'id.employment-type',
  code,
}))

/**
 * Builds the policy of an Indonesian leave type from the table of HR spec 9.4.8. Values the table
 * does not give are starter values: no notice, no half days, a proof due 30 days after the start,
 * and for a leave with a balance no limit below a year per request.
 *
 * @param code - Code in `id.leave-type`.
 * @param rules - What differs from those starter values.
 * @returns The policy.
 */
function policy(
  code: string,
  rules: Partial<LeavePolicyFields>,
): BundlePolicy {
  return {
    leave_type: { system: 'id.leave-type', code },
    balance: { kind: 'none' },
    counting: 'working_days',
    half_days: false,
    paid: true,
    employment_types: EMPLOYEES,
    approval: { steps: 'one_step', two_step_above_days: null },
    notice_days: 0,
    retroactive_days: 0,
    max_days_per_request: 366,
    proof: null,
    notes: null,
    ...rules,
  }
}

/**
 * A leave of a fixed number of days per event, so a request never exceeds them.
 *
 * @param days - Days of the event.
 * @returns The balance and the matching limit per request.
 */
function perEvent(
  days: number,
): Pick<LeavePolicyFields, 'balance' | 'max_days_per_request'> {
  return { balance: { kind: 'per_event', days }, max_days_per_request: days }
}

/**
 * Indonesian starter policies (bundle `id`), the table of HR spec 9.4.8. Every value must be
 * verified against `REG-UUK`, `REG-PP35`, UU No. 4/2024 and the hospital's PKB before go-live.
 */
const INDONESIA_POLICIES: readonly BundlePolicy[] = [
  policy('tahunan', {
    balance: {
      kind: 'period',
      period: 'service_year',
      days: 12,
      min_service_months: 12,
      carry_over: null,
      deduct_collective_leave: false,
    },
    half_days: true,
    notes: 'REG-UUK: 12 working days after 12 months of continuous service.',
  }),
  policy('sakit', {
    retroactive_days: 3,
    proof: { due_days: 3 },
    notes: 'Doctor note, due 3 days after the start.',
  }),
  policy('melahirkan', {
    ...perEvent(90),
    counting: 'calendar_days',
    approval: { steps: 'two_step', two_step_above_days: null },
    proof: { due_days: 30 },
    notes: 'Verify the length against UU 4/2024, which allows longer.',
  }),
  policy('keguguran', {
    ...perEvent(45),
    counting: 'calendar_days',
    approval: { steps: 'two_step', two_step_above_days: null },
    retroactive_days: 3,
    proof: { due_days: 30 },
  }),
  policy('haid', { max_days_per_request: 2, retroactive_days: 1 }),
  policy('menikah', { ...perEvent(3), proof: { due_days: 30 } }),
  policy('menikahkan_anak', perEvent(2)),
  policy('khitan_baptis_anak', perEvent(2)),
  policy('istri_melahirkan', {
    ...perEvent(2),
    retroactive_days: 3,
    proof: { due_days: 30 },
    notes: 'Verify the days against UU 4/2024.',
  }),
  policy('duka_keluarga', { ...perEvent(2), retroactive_days: 3 }),
  policy('duka_serumah', { ...perEvent(1), retroactive_days: 3 }),
  policy('tanpa_upah', {
    paid: false,
    approval: { steps: 'two_step', two_step_above_days: null },
  }),
  policy('tidak_tersedia', {
    paid: false,
    employment_types: [{ system: 'id.employment-type', code: 'mitra' }],
  }),
]

/**
 * Policy bundles a tenant can import (HR plan 8.1 LP8). They are code, versioned with the
 * application, like the code concept bundles.
 */
export const LEAVE_POLICY_BUNDLES: Readonly<
  Record<string, readonly BundlePolicy[]>
> = {
  id: INDONESIA_POLICIES,
}

/**
 * Returns a policy bundle by name.
 *
 * @param name - Bundle name, for example `id`.
 * @returns The policies of the bundle, or `undefined` for an unknown name.
 */
export function findPolicyBundle(
  name: string,
): readonly BundlePolicy[] | undefined {
  return Object.prototype.hasOwnProperty.call(LEAVE_POLICY_BUNDLES, name)
    ? LEAVE_POLICY_BUNDLES[name]
    : undefined
}
