import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate } from './common/calendar'
import { type Coding } from './common/coding'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * Activity that earned professional credits.
 *
 * @property title - Activity title.
 * @property category - Activity category in the credit system.
 * @property provider - Organizer, or `null`.
 */
export interface CpdActivity {
  title: string
  category: Coding
  provider: string | null
}

/**
 * Professional credit points earned by an employee: SKP, CME or CPD
 * (`human-resource-collections.md` 3.4, HR spec 6.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Who earned the points.
 * @property credit_system - For example `id.skp`, `us.cme`.
 * @property activity - What was done.
 * @property activity_date - When it was done.
 * @property points - Points, with at most two decimals.
 * @property evidence - Certificate or other proof.
 * @property source - Entered by hand, created from a training record, or loaded from a national platform.
 * @property status - Review status.
 * @property created_by - Who created the record.
 */
export class CpdRecord extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  credit_system!: Coding
  activity!: CpdActivity
  activity_date!: LocalDate
  points!: number
  evidence!: FileRef | null
  source!: 'manual' | 'training_record' | 'external_platform'
  status!: 'submitted' | 'accepted' | 'rejected'
  created_by!: ActorRef
}
