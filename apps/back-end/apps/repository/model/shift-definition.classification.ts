import { type FieldClassification } from '@utility/history/record'
import { type ShiftDefinition } from './shift-definition'

/**
 * Sensitivity of `ShiftDefinition` fields for the change log. Shift definitions are internal.
 */
export const ShiftDefinitionClassification: FieldClassification<ShiftDefinition> =
  {
    default: 'internal',
    arrayKeys: {
      name: ['locale'],
    },
  }
