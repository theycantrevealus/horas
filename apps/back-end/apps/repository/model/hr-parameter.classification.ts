import { type FieldClassification } from '@utility/history/record'
import { type HrParameter } from './hr-parameter'

/**
 * Sensitivity of `HrParameter` fields for the change log. HR parameters are internal configuration.
 */
export const HrParameterClassification: FieldClassification<HrParameter> = {
  default: 'internal',
}
