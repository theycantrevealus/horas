import { type FieldClassification } from '@utility/history/record'
import { type ProfessionalLicense } from './professional-license'

/**
 * Sensitivity of `ProfessionalLicense` fields for the change log. Licence numbers and expiry are internal (HR spec 14); free-text notes on verification, rejection and revocation are confidential.
 */
export const ProfessionalLicenseClassification: FieldClassification<ProfessionalLicense> =
  {
    default: 'internal',
    fields: {
      'verification.notes': 'confidential',
      'rejection.notes': 'confidential',
      'revocation.notes': 'confidential',
    },
  }
