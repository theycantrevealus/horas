import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ClosedDatePeriod, type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * Where a separation is (`human-resource-management.md` 9.10.3).
 */
export type SeparationStatus = 'planned' | 'completed' | 'cancelled'

/**
 * One item of the exit checklist.
 *
 * @property item - The item, a code of `…exit-checklist-item`.
 * @property done - Who marked it done and when, or `null` while open.
 */
export interface SeparationChecklistItem {
  item: Coding
  done: { by: ActorRef; at: Date } | null
}

/**
 * What completion closed, as counts only.
 *
 * @property at - When it ran.
 * @property by - Who or what ran it (the worker job or an HR Manager).
 * @property counts - How many of each kind were closed.
 */
export interface SeparationCompletion {
  at: Date
  by: ActorRef
  counts: {
    assignments: number
    sessions: number
    leave_requests: number
    appointments: number
    memberships: number
    position_assignments: number
  }
}

/**
 * What is left to settle at completion: no amounts, pay is HR spec 9.7.
 *
 * @property leave - Per yearly leave type, the days left on the last working day (negative when
 * more was taken than earned).
 * @property notes - Other items HR notes, or `null`.
 */
export interface SeparationSettlement {
  leave: {
    leave_type: Coding
    period: ClosedDatePeriod
    days_left: number
  }[]
  notes: string | null
}

/**
 * The end of an employee's employment (`human-resource-collections.md` 10.1). The reason is in the
 * separate `SeparationDetail`.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Who is leaving; at most one separation that is not cancelled.
 * @property facility_id - The facility whose time zone decides when the last day has ended, or
 * `null` when none could be found (UTC then).
 * @property type - The separation type, a code of `…separation-type`.
 * @property contract_action - Whether completion ends or terminates the contract; copied from the
 * type, so a later change of the code does not change a planned separation.
 * @property last_working_day - The last day the employee works, local to the facility.
 * @property notice_received_on - When the resignation or notice was given, or `null`.
 * @property immediate - Completed when recorded, not after the last working day.
 * @property status - Planned, completed or cancelled.
 * @property status_since - When the status last changed.
 * @property completion - What completion closed, or `null` while it has not run.
 * @property checklist - The exit checklist, one item per active code when recorded.
 * @property settlement - Set at completion, or `null`.
 * @property created_by - Who created the record.
 */
export class Separation extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  facility_id!: string | null
  type!: Coding
  contract_action!: 'end' | 'terminate'
  last_working_day!: LocalDate
  notice_received_on!: LocalDate | null
  immediate!: boolean
  status!: SeparationStatus
  status_since!: Date
  completion!: SeparationCompletion | null
  checklist!: SeparationChecklistItem[]
  settlement!: SeparationSettlement | null
  created_by!: ActorRef
}
