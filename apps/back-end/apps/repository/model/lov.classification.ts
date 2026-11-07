import { type FieldClassification } from '@utility/history/record'
import { type LOV } from './lov'

/**
 * Sensitivity of LOV fields for the change log. LOVs are platform reference data shown in
 * drop-downs, so their values are public; `additional` is free-form and stays internal.
 */
export const LovClassification: FieldClassification<LOV> = {
  default: 'internal',
  fields: {
    group_name: 'public',
    set_value: 'public',
    description: 'public',
  },
}
