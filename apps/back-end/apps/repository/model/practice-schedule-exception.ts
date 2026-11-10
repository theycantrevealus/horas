import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalDate, type LocalTime } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * New time of a moved session.
 *
 * @property date - New date.
 * @property start_time - New local start.
 * @property end_time - New local end.
 */
export interface MovedSession {
  date: LocalDate
  start_time: LocalTime
  end_time: LocalTime
}

/**
 * A cancelled or moved session of a practice schedule (`human-resource-collections.md` 5.7).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property schedule_id - The schedule; one exception per schedule and date.
 * @property employee_id - The doctor, copied from the schedule.
 * @property unit_id - The polyclinic, copied from the schedule.
 * @property date - Date of the affected session.
 * @property kind - Cancelled or moved.
 * @property moved_to - New time when moved, otherwise `null`.
 * @property reason - Leave, training, emergency, other.
 * @property source - Entered by hand, or created from leave or training.
 * @property created_by - Who created the record.
 */
export class PracticeScheduleException extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  schedule_id!: string
  employee_id!: string
  unit_id!: string
  date!: LocalDate
  kind!: 'cancelled' | 'moved'
  moved_to!: MovedSession | null
  reason!: Coding
  source!: { kind: 'manual' | 'leave' | 'training'; ref_id: string | null }
  created_by!: ActorRef
}
