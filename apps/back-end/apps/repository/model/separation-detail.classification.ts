import { type FieldClassification } from '@utility/history/record'
import { type SeparationDetail } from './separation-detail'

/**
 * Sensitivity of `SeparationDetail` fields for the change log: the reason is highly confidential.
 */
export const SeparationDetailClassification: FieldClassification<SeparationDetail> =
  {
    default: 'highly_confidential',
    fields: {
      separation_id: 'internal',
      employee_id: 'internal',
    },
  }
