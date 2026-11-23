import { type FieldClassification } from '@utility/history/record'
import { type Separation } from './separation'

/**
 * Sensitivity of `Separation` fields for the change log. A separation is internal; the settlement
 * shows leave days and is confidential. The reason is in the separate detail.
 */
export const SeparationClassification: FieldClassification<Separation> = {
  default: 'internal',
  fields: {
    settlement: 'confidential',
  },
}
