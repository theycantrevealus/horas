import { type FieldClassification } from '@utility/history/record'
import { type LeavePolicy } from './leave-policy'

/**
 * Sensitivity of `LeavePolicy` fields for the change log. Leave policies are internal.
 */
export const LeavePolicyClassification: FieldClassification<LeavePolicy> = {
  default: 'internal',
}
