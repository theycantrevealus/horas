import { type FieldClassification } from '@utility/history/record'
import { type CpdRecord } from './cpd-record'

/**
 * Sensitivity of `CpdRecord` fields for the change log. Credit records are internal.
 */
export const CpdRecordClassification: FieldClassification<CpdRecord> = {
  default: 'internal',
}
