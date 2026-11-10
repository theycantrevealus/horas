import { type FieldClassification } from '@utility/history/record'
import { type PracticeSchedule } from './practice-schedule'

/**
 * Sensitivity of `PracticeSchedule` fields for the change log. Practice schedules are public inside the hospital (HR spec 14).
 */
export const PracticeScheduleClassification: FieldClassification<PracticeSchedule> =
  {
    default: 'public',
  }
