import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ClosedDatePeriod, type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * Lifecycle of a leave request (`human-resource-management.md` 9.4.3).
 */
export type LeaveRequestStatus =
  'requested' | 'head_approved' | 'approved' | 'rejected' | 'cancelled'

/**
 * Why a date counts or not (`human-resource-management.md` 9.4.6).
 */
export type LeaveDayReason =
  'working' | 'rest_day' | 'holiday' | 'collective_leave' | 'calendar_day'

/**
 * What decided a day's count: the roster, the facility's working week, the Head of Unit or the
 * policy (every day counts).
 */
export type LeaveDaySource = 'roster' | 'working_week' | 'head' | 'policy'

/**
 * One date of the leave with its count.
 *
 * @property date - The local date.
 * @property count - 1, 0.5 (a half day) or 0 (a rest day or a holiday).
 * @property why - Why it counts or not.
 * @property set_by - What decided the count.
 */
export interface LeaveDay {
  date: LocalDate
  count: 0 | 0.5 | 1
  why: LeaveDayReason
  set_by: LeaveDaySource
}

/**
 * The rules a request is decided under, copied from the policy so a new policy version does not
 * change it.
 *
 * @property balance_kind - Yearly, per event, or none.
 * @property counting - Working days or calendar days.
 * @property steps - One or two approval steps.
 */
export interface LeaveRequestRules {
  balance_kind: 'period' | 'per_event' | 'none'
  counting: 'working_days' | 'calendar_days'
  steps: 'one_step' | 'two_step'
}

/**
 * Who decides the first step.
 *
 * @property kind - The Head of the requester's unit, the Head of its parent unit, or HR Manager.
 * @property unit_id - The unit whose Head decides, or `null` for HR Manager.
 * @property employee_id - The Head found when the first step is decided, or `null`.
 */
export interface LeaveFirstDecider {
  kind: 'unit_head' | 'parent_head' | 'hr_manager'
  unit_id: string | null
  employee_id: string | null
}

/**
 * The deciders of a request.
 *
 * @property first - Who decides the first step.
 * @property second - Whether HR Manager gives a second approval.
 */
export interface LeaveDeciders {
  first: LeaveFirstDecider
  second: boolean
}

/**
 * The replacement who covers the work, named at the first step.
 *
 * @property employee_id - The replacement, or `null` when there is none.
 * @property none_reason - Why there is none, or `null`.
 */
export interface LeaveReplacement {
  employee_id: string | null
  none_reason: string | null
}

/**
 * One decision of a step.
 *
 * @property step - First or second step.
 * @property outcome - Approved or rejected.
 * @property by - Who decided.
 * @property at - When.
 * @property reason - The reason of a rejection, or `null`.
 */
export interface LeaveDecision {
  step: 'first' | 'second'
  outcome: 'approved' | 'rejected'
  by: ActorRef
  at: Date
  reason: string | null
}

/**
 * The cover of the cancelled shifts by the replacement (`human-resource-management.md` 9.4.4.3).
 *
 * @property cancelled_assignment_ids - Shifts cancelled by the approval.
 * @property confirmed - Who confirmed the cover and the assignments it created, or `null`.
 */
export interface LeaveCover {
  cancelled_assignment_ids: string[]
  confirmed: {
    by: ActorRef
    at: Date
    created_assignment_ids: string[]
  } | null
}

/**
 * A request for leave (`human-resource-collections.md` 9.3). The reason and the proof are in the
 * separate `LeaveRequestDetail`.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The requester.
 * @property unit_id - Unit of the requester's open primary assignment when the request was made, or `null`.
 * @property facility_id - Facility of that unit, or `null`.
 * @property leave_type - The leave type.
 * @property policy_id - The policy version in force on the first date.
 * @property rules - The rules the request is decided under.
 * @property period - First and last date.
 * @property half_days - A half first or last day.
 * @property days - The day breakdown.
 * @property total_days - The sum of the days.
 * @property entitlement_period - The period the days are charged to, or `null`.
 * @property deciders - Who decides.
 * @property replacement - The replacement, set at the first step, or `null`.
 * @property decisions - The decisions so far.
 * @property status - Lifecycle status.
 * @property status_since - When the status last changed.
 * @property proof_due_on - Last day to give the proof, or `null` when none is needed.
 * @property proof_received - Whether the proof was given.
 * @property cover - The cover of cancelled shifts, or `null`.
 * @property created_by - Who created the record.
 */
export class LeaveRequest extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  unit_id!: string | null
  facility_id!: string | null
  leave_type!: Coding
  policy_id!: string
  rules!: LeaveRequestRules
  period!: ClosedDatePeriod
  half_days!: { first: boolean; last: boolean }
  days!: LeaveDay[]
  total_days!: number
  entitlement_period!: ClosedDatePeriod | null
  deciders!: LeaveDeciders
  replacement!: LeaveReplacement | null
  decisions!: LeaveDecision[]
  status!: LeaveRequestStatus
  status_since!: Date
  proof_due_on!: LocalDate | null
  proof_received!: boolean
  cover!: LeaveCover | null
  created_by!: ActorRef
}
