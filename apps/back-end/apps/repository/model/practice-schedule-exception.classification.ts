import { type FieldClassification } from '@utility/history/record'
import { type PracticeScheduleException } from './practice-schedule-exception'

/**
 * Sensitivity of `PracticeScheduleException` fields for the change log. Exceptions are internal: the reason can reveal leave or sickness.
 */
export const PracticeScheduleExceptionClassification: FieldClassification<PracticeScheduleException> =
  {
    default: 'internal',
  }
