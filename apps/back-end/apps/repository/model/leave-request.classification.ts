import { type FieldClassification } from '@utility/history/record'
import { type LeaveRequest } from './leave-request'

/**
 * Sensitivity of `LeaveRequest` fields for the change log. The leave type and the days are
 * confidential (HR spec 14); the free text of a decision or of "no replacement" is highly
 * confidential; identifiers and the status are internal.
 */
export const LeaveRequestClassification: FieldClassification<LeaveRequest> = {
  default: 'confidential',
  fields: {
    employee_id: 'internal',
    unit_id: 'internal',
    facility_id: 'internal',
    policy_id: 'internal',
    status: 'internal',
    status_since: 'internal',
    proof_received: 'internal',
    'deciders.first.unit_id': 'internal',
    'deciders.first.employee_id': 'internal',
    'replacement.employee_id': 'internal',
    'replacement.none_reason': 'highly_confidential',
    'decisions.reason': 'highly_confidential',
  },
  arrayKeys: {
    days: ['date'],
    decisions: ['step'],
  },
}
