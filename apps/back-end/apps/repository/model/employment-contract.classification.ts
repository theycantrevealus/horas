import { type FieldClassification } from '@utility/history/record'
import { type EmploymentContract } from './employment-contract'

/**
 * Sensitivity of `EmploymentContract` fields for the change log. Contracts are internal; free-text termination notes are confidential.
 */
export const EmploymentContractClassification: FieldClassification<EmploymentContract> =
  {
    default: 'internal',
    fields: {
      'termination.notes': 'confidential',
    },
  }
