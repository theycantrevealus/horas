import { type FieldClassification } from '@utility/history/record'
import { type CredentialAssessment } from './credential-assessment'

/**
 * Sensitivity of `CredentialAssessment` fields for the change log. Credentialing assessments are highly confidential (HR spec 14) and their reads are recorded (`HR-AUD-003`).
 */
export const CredentialAssessmentClassification: FieldClassification<CredentialAssessment> =
  {
    default: 'highly_confidential',
  }
