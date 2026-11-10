import { type FieldClassification } from '@utility/history/record'
import { type PrivilegeGrant } from './privilege-grant'

/**
 * Sensitivity of `PrivilegeGrant` fields for the change log. Grants are internal (HR spec 14: privileges); reasons for suspension or revocation are confidential.
 */
export const PrivilegeGrantClassification: FieldClassification<PrivilegeGrant> =
  {
    default: 'internal',
    fields: {
      'status_change.reason': 'confidential',
    },
  }
