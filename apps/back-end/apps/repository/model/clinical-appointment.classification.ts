import { type FieldClassification } from '@utility/history/record'
import { type ClinicalAppointment } from './clinical-appointment'

/**
 * Sensitivity of `ClinicalAppointment` fields for the change log. SPKs are internal; suspension and revocation reasons are confidential.
 */
export const ClinicalAppointmentClassification: FieldClassification<ClinicalAppointment> =
  {
    default: 'internal',
    fields: {
      'suspension.reason': 'confidential',
      'revocation.reason': 'confidential',
    },
  }
