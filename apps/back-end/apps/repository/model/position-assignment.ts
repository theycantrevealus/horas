import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { type DecisionRef } from './common/decision'
import { Timestamp } from './timestamp'

/**
 * Lifecycle of an assignment.
 */
export type AssignmentStatus = 'planned' | 'active' | 'ended'

/**
 * Who holds which position, and when: the history of transfers, promotions and acting roles
 * (`account-and-workforce-collections.md` 4.6, HR spec 9.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee.
 * @property contract_id - Contract the assignment is under.
 * @property position_id - The position.
 * @property unit_id - Unit of the position, copied for scoped queries.
 * @property facility_id - Facility of the position, copied for scoped queries.
 * @property is_primary - At most one open primary assignment per employee.
 * @property is_head_of_unit - Copied from the position; at most one open head per unit.
 * @property kind - Hire, transfer, promotion, acting (Plt.) or secondment.
 * @property period - Assignment dates.
 * @property fte - Share of full time spent in this position.
 * @property status - Lifecycle status.
 * @property is_open - True while `planned` or `active`; maintained by the repository for the unique indexes.
 * @property decision_ref - SK that made the assignment, or `null`.
 * @property created_by - Who created the record.
 */
export class PositionAssignment extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  contract_id!: string
  position_id!: string
  unit_id!: string
  facility_id!: string
  is_primary!: boolean
  is_head_of_unit!: boolean
  kind!: Coding
  period!: DatePeriod
  fte!: number
  status!: AssignmentStatus
  is_open!: boolean
  decision_ref!: DecisionRef | null
  created_by!: ActorRef
}
