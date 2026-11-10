import { type FieldClassification } from '@utility/history/record'
import { type CredentialApplication } from './credential-application'

/**
 * Sensitivity of `CredentialApplication` fields for the change log. Applications are internal; the committee recommendation, the Director's reasons and conflict declarations are highly confidential (HR spec 14).
 */
export const CredentialApplicationClassification: FieldClassification<CredentialApplication> =
  {
    default: 'internal',
    fields: {
      'recommendation.summary': 'highly_confidential',
      'recommendation.privileges': 'highly_confidential',
      'decision.reason': 'highly_confidential',
      return_reason: 'highly_confidential',
      withdrawal_reason: 'confidential',
      'assessors.conflict_declaration': 'highly_confidential',
    },
    arrayKeys: {
      requested_privileges: ['catalog_item_id'],
      assessors: ['employee_id'],
    },
  }
