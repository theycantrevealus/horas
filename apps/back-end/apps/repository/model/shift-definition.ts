import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type LocalTime } from './common/calendar'
import { type LocalizedText } from './common/localized-text'
import { Timestamp } from './timestamp'

/**
 * Kind of shift (HR spec 8.2).
 */
export type ShiftType = 'regular' | 'on_call_onsite' | 'on_call_remote' | 'off'

/**
 * A shift a facility uses, for example P (pagi), S, M (malam), L (libur)
 * (`human-resource-collections.md` 5.1).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property facility_id - Facility that defines it.
 * @property code - Unique per facility.
 * @property name - Name per language.
 * @property type - Kind of shift.
 * @property start_time - Local start, or `null` for `off`.
 * @property end_time - Local end; earlier than `start_time` means the next day. `null` for `off`.
 * @property paid_minutes - Working time counted.
 * @property is_night - Counts toward `MAX_CONSECUTIVE_NIGHTS` (`HR-ROS-015`).
 * @property unit_ids - Units that may use it; empty means all.
 * @property status - Retired shifts cannot be assigned.
 * @property created_by - Who created the record.
 */
export class ShiftDefinition extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  facility_id!: string
  code!: string
  name!: LocalizedText[]
  type!: ShiftType
  start_time!: LocalTime | null
  end_time!: LocalTime | null
  paid_minutes!: number
  is_night!: boolean
  unit_ids!: string[]
  status!: 'active' | 'retired'
  created_by!: ActorRef
}
