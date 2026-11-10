import { type FieldClassification } from '@utility/history/record'
import { type CpdSummary } from './cpd-summary'

/**
 * Sensitivity of `CpdSummary` fields for the change log. Credit totals are internal.
 */
export const CpdSummaryClassification: FieldClassification<CpdSummary> = {
  default: 'internal',
}
