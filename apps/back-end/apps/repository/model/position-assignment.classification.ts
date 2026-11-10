import { type FieldClassification } from '@utility/history/record'
import { type PositionAssignment } from './position-assignment'

/**
 * Sensitivity of `PositionAssignment` fields for the change log. Assignments are internal (HR spec 14).
 */
export const PositionAssignmentClassification: FieldClassification<PositionAssignment> =
  {
    default: 'internal',
  }
