import { type FieldClassification } from '@utility/history/record'
import { type CommitteeMembership } from './committee-membership'

/**
 * Sensitivity of `CommitteeMembership` fields for the change log. Committee memberships are internal.
 */
export const CommitteeMembershipClassification: FieldClassification<CommitteeMembership> =
  {
    default: 'internal',
  }
