import { type FieldClassification } from '@utility/history/record'
import { type HrImport } from './hr-import'

/**
 * Sensitivity of `HrImport` fields for the change log. Imports are internal; errors hold codes only, never cell values.
 */
export const HrImportClassification: FieldClassification<HrImport> = {
  default: 'internal',
}
