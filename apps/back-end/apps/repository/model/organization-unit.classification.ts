import { type FieldClassification } from '@utility/history/record'
import { type OrganizationUnit } from './organization-unit'

/**
 * Sensitivity of `OrganizationUnit` fields for the change log. Unit names and types are public inside the hospital; the rest is internal.
 */
export const OrganizationUnitClassification: FieldClassification<OrganizationUnit> =
  {
    default: 'internal',
    fields: {
      name: 'public',
      type: 'public',
      is_clinical: 'public',
    },
    arrayKeys: {
      name: ['locale'],
      external_ids: ['system'],
    },
  }
