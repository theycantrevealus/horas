import { type FieldClassification } from '@utility/history/record'
import { type LeaveRequestDetail } from './leave-request-detail'

/**
 * Sensitivity of `LeaveRequestDetail` fields for the change log. The reason and the proof (a
 * doctor's note, for example) are highly confidential; the identifiers are internal.
 */
export const LeaveRequestDetailClassification: FieldClassification<LeaveRequestDetail> =
  {
    default: 'highly_confidential',
    fields: {
      request_id: 'internal',
      employee_id: 'internal',
    },
  }
