import { type FieldClassification } from '@utility/history/record'
import { type CoverageRequirement } from './coverage-requirement'

/**
 * Sensitivity of `CoverageRequirement` fields for the change log. Coverage requirements are internal.
 */
export const CoverageRequirementClassification: FieldClassification<CoverageRequirement> =
  {
    default: 'internal',
  }
