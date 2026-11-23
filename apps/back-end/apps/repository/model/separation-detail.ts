import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * The highly confidential part of a separation (`human-resource-collections.md` 10.2): the reason.
 * It is apart from the separation because fewer people read it; lists and the roster never read it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property separation_id - The separation; unique per tenant.
 * @property employee_id - The employee.
 * @property reason - Why, 1 to 1000 characters.
 * @property created_by - Who created the record.
 */
export class SeparationDetail extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  separation_id!: string
  employee_id!: string
  reason!: string
  created_by!: ActorRef
}
