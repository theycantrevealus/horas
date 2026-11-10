import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type ClosedDatePeriod } from './common/calendar'
import { type Coding } from './common/coding'
import { Timestamp } from './timestamp'

/**
 * Latest known credit total of an employee in one credit system, used for SIP renewal checks
 * (`human-resource-collections.md` 3.5, `HR-LIC-010`).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee; one summary per credit system.
 * @property credit_system - For example `id.skp`.
 * @property profession - The requirement depends on it (`SKP_REQUIRED_POINTS`).
 * @property cycle - Counting period, usually the SIP's validity.
 * @property total_points - Total in the cycle.
 * @property checked_at - When the total was computed or read from the platform.
 * @property source - Computed from `cpd_records` or read from a national platform.
 * @property created_by - Who created the record.
 */
export class CpdSummary extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  employee_id!: string
  credit_system!: Coding
  profession!: Coding
  cycle!: ClosedDatePeriod
  total_points!: number
  checked_at!: Date
  source!: 'computed' | 'external_platform'
  created_by!: ActorRef
}
