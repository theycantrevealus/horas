import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ActorStamp } from './common/actor-stamp'
import { type ClosedDatePeriod, type LocalDate } from './common/calendar'
import { Timestamp } from './timestamp'

/**
 * Roster status (HR spec 8.3).
 */
export type RosterStatus =
  'draft' | 'submitted' | 'approved' | 'published' | 'closed'

/**
 * Accepted coverage gap, recorded by the approver (`HR-ROS-021`).
 *
 * @property date - Day of the gap.
 * @property shift_definition_id - Shift of the gap.
 * @property requirement_id - Requirement not met.
 * @property reason - Why it was accepted.
 * @property by - Who recorded it.
 * @property at - When.
 */
export interface CoverageOverride {
  date: LocalDate
  shift_definition_id: string
  requirement_id: string
  reason: string
  by: ActorRef
  at: Date
}

/**
 * Summary of the last full validation, for list screens. Details are recomputed.
 *
 * @property checked_at - When validated.
 * @property violations - Rule violations found.
 * @property coverage_gaps - Coverage gaps found.
 */
export interface RosterValidation {
  checked_at: Date
  violations: number
  coverage_gaps: number
}

/**
 * The plan of one unit for one period (`human-resource-collections.md` 5.4, HR spec 8.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - The unit; one roster per unit and period.
 * @property facility_id - Facility of the unit.
 * @property period - Usually a calendar month (`ROSTER_PERIOD`).
 * @property status - Current status.
 * @property revision - Increases on each published change; separate from `version`.
 * @property prepared_by - Head of Unit who prepared it.
 * @property submitted - Submission, or `null`.
 * @property approved - Approval, or `null` (also when approval is not required).
 * @property published - Publication, or `null`.
 * @property closed - Closing after attendance reconciliation, or `null`.
 * @property return_reason - Why it was last returned, or `null`.
 * @property coverage_overrides - Accepted coverage gaps.
 * @property validation - Last validation summary, or `null`.
 * @property created_by - Who created the record.
 */
export class Roster extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  unit_id!: string
  facility_id!: string
  period!: ClosedDatePeriod
  status!: RosterStatus
  revision!: number
  prepared_by!: ActorRef
  submitted!: ActorStamp | null
  approved!: ActorStamp | null
  published!: ActorStamp | null
  closed!: ActorStamp | null
  return_reason!: string | null
  coverage_overrides!: CoverageOverride[]
  validation!: RosterValidation | null
  created_by!: ActorRef
}
