import { type FieldClassification } from '@utility/history/record'
import { type Organization } from './organization'

/**
 * Sensitivity of `Organization` fields for the change log. Organizations are internal reference data; their identifiers are company numbers, not personal data.
 */
export const OrganizationClassification: FieldClassification<Organization> = {
  default: 'internal',
  arrayKeys: {
    identifiers: ['system'],
  },
}
