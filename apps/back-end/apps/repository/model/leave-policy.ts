import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * How many days a `period` policy lets an employee carry into the next period.
 *
 * @property max_days - Most days that move to the next period.
 * @property expires_after_months - Months the carried days stay usable.
 */
export interface LeaveCarryOver {
  max_days: number
  expires_after_months: number
}

/**
 * The balance rule of a leave policy (`human-resource-management.md` 9.4.2). A `period` policy
 * grants days every entitlement period, a `per_event` policy grants days for each event, and a
 * `none` policy has no balance.
 *
 * @property kind - Which rule applies.
 * @property period - For `period`: calendar year or the year from the service anniversary.
 * @property days - Days per period, or per event.
 * @property min_service_months - For `period`: months of service before the first entitlement.
 * @property carry_over - For `period`: unused days that move on, or `null` for none.
 * @property deduct_collective_leave - For `period`: collective leave days are taken from the balance.
 */
export type LeaveBalanceRule =
  | {
      kind: 'period'
      period: 'calendar_year' | 'service_year'
      days: number
      min_service_months: number
      carry_over: LeaveCarryOver | null
      deduct_collective_leave: boolean
    }
  | { kind: 'per_event'; days: number }
  | { kind: 'none' }

/**
 * When a request needs the second approval.
 *
 * @property steps - `one_step` (Head of Unit) or `two_step` (Head of Unit, then HR Manager).
 * @property two_step_above_days - Makes a one-step policy two-step above this many days, or `null`.
 */
export interface LeaveApprovalRule {
  steps: 'one_step' | 'two_step'
  two_step_above_days: number | null
}

/**
 * The rules of one leave type in one tenant from a date (`human-resource-collections.md` 9.2).
 * A change is a new version with a later `effective_from`.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property leave_type - The leave type, a code of a `…leave-type` system.
 * @property effective_from - First date this version applies.
 * @property balance - How days are granted.
 * @property counting - Working days (9.4.6) or every calendar day.
 * @property half_days - Whether half days may be requested.
 * @property paid - Whether the leave is paid, for payroll.
 * @property employment_types - Employment types that may use it; empty means all.
 * @property approval - One or two approval steps.
 * @property notice_days - Days between the request and the first leave day.
 * @property retroactive_days - Days after the start the leave may still be requested; 0 for none.
 * @property max_days_per_request - Most days of one request.
 * @property proof - Whether proof is needed and how many days after the start it is due, or `null`.
 * @property notes - Legal basis, for example the PKB article.
 * @property source - Entered by hand, or loaded from a country bundle.
 * @property created_by - Who created the record.
 */
export class LeavePolicy extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  leave_type!: Coding
  effective_from!: LocalDate
  balance!: LeaveBalanceRule
  counting!: 'working_days' | 'calendar_days'
  half_days!: boolean
  paid!: boolean
  employment_types!: Coding[]
  approval!: LeaveApprovalRule
  notice_days!: number
  retroactive_days!: number
  max_days_per_request!: number
  proof!: { due_days: number } | null
  notes!: string | null
  source!: { kind: 'manual' | 'bundle'; bundle_id: string | null }
  created_by!: ActorRef
}
