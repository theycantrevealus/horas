import { type FieldClassification } from '@utility/history/record'
import { type RosterAssignment } from './roster-assignment'

/**
 * Sensitivity of `RosterAssignment` fields for the change log. Roster assignments are internal (HR spec 14).
 */
export const RosterAssignmentClassification: FieldClassification<RosterAssignment> =
  {
    default: 'internal',
  }
