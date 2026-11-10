import { type FieldClassification } from '@utility/history/record'
import { type Roster } from './roster'

/**
 * Sensitivity of `Roster` fields for the change log. Rosters are internal (HR spec 14).
 */
export const RosterClassification: FieldClassification<Roster> = {
  default: 'internal',
  arrayKeys: {
    coverage_overrides: ['date', 'shift_definition_id', 'requirement_id'],
  },
}
