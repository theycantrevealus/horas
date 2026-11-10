import { type FieldClassification } from '@utility/history/record'
import { type Facility } from './facility'

/**
 * Sensitivity of `Facility` fields for the change log. Facility names and addresses are public inside the hospital; the rest is internal.
 */
export const FacilityClassification: FieldClassification<Facility> = {
  default: 'internal',
  fields: {
    name: 'public',
    address: 'public',
  },
  arrayKeys: {
    name: ['locale'],
    external_ids: ['system'],
  },
}
