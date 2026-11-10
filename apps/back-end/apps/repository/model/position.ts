import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * A job in a unit (`account-and-workforce-collections.md` 4.5).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - Unit the position belongs to.
 * @property code - Unique per unit.
 * @property title - Title per language.
 * @property kind - Structural (management) or functional position.
 * @property is_head_of_unit - At most one active head position per unit.
 * @property allowed_professions - Professions that may fill it; empty for non-clinical positions.
 * @property grade - Job grade, or `null`.
 * @property budgeted_headcount - Number of people the position is budgeted for.
 * @property job_description - Job description document.
 * @property period - When the position exists, or `null`.
 * @property status - Closed positions stay for history.
 * @property created_by - Who created the record.
 */
export class Position extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  unit_id!: string
  code!: string
  title!: LocalizedText[]
  kind!: 'structural' | 'functional'
  is_head_of_unit!: boolean
  allowed_professions!: Coding[]
  grade!: Coding | null
  budgeted_headcount!: number
  job_description!: FileRef | null
  period!: DatePeriod | null
  status!: 'active' | 'closed'
  created_by!: ActorRef
}
