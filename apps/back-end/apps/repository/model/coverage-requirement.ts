import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * Days a coverage requirement applies to.
 */
export type DayPattern = 'all' | 'weekdays' | 'weekends_holidays'

/**
 * Which staff count toward a requirement. Unset criteria match anyone.
 *
 * @property workforce_category - Required category, or `null`.
 * @property profession - Required profession, or `null`.
 * @property specialty - Required specialty, or `null`.
 * @property min_clinical_level - Lowest career level that counts, or `null`.
 */
export interface CoverageMatch {
  workforce_category: Coding | null
  profession: Coding | null
  specialty: Coding | null
  min_clinical_level: Coding | null
}

/**
 * Minimum staffing of a unit for one shift (`human-resource-collections.md` 5.3, `HR-ROS-020`).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - The unit.
 * @property shift_definition_id - The shift.
 * @property day_pattern - Days it applies to.
 * @property match - Which staff count.
 * @property min_count - Minimum number of matching staff.
 * @property team_leader_required - One counted person must be team leader (`HR-ROS-022`).
 * @property period - When the requirement applies.
 * @property status - Retired requirements are not checked.
 * @property created_by - Who created the record.
 */
export class CoverageRequirement extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  unit_id!: string
  shift_definition_id!: string
  day_pattern!: DayPattern
  match!: CoverageMatch
  min_count!: number
  team_leader_required!: boolean
  period!: DatePeriod
  status!: 'active' | 'retired'
  created_by!: ActorRef
}
