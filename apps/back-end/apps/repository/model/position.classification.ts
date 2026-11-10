import { type FieldClassification } from '@utility/history/record'
import { type Position } from './position'

/**
 * Sensitivity of `Position` fields for the change log. Position titles are public inside the hospital; the rest is internal.
 */
export const PositionClassification: FieldClassification<Position> = {
  default: 'internal',
  fields: {
    title: 'public',
  },
  arrayKeys: {
    title: ['locale'],
  },
}
