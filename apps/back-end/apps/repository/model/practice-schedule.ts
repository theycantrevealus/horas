import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type DatePeriod, type LocalTime } from './common/calendar'
import { Timestamp } from './timestamp'

/**
 * Recurring weekly outpatient session of a Tenaga Medis, used by patient registration
 * (`human-resource-collections.md` 5.6, HR spec 8.2).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The doctor.
 * @property unit_id - The polyclinic.
 * @property facility_id - Facility of the polyclinic.
 * @property day_of_week - ISO weekday, 1 (Monday) to 7.
 * @property start_time - Local start.
 * @property end_time - Local end.
 * @property quota - Maximum patients per session, or `null` for no limit.
 * @property period - Validity.
 * @property status - Ended schedules stay for history.
 * @property created_by - Who created the record.
 */
export class PracticeSchedule extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  unit_id!: string
  facility_id!: string
  day_of_week!: number
  start_time!: LocalTime
  end_time!: LocalTime
  quota!: number | null
  period!: DatePeriod
  status!: 'active' | 'ended'
  created_by!: ActorRef
}
