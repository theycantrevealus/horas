import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { type FileRef } from './common/file-ref'
import { Timestamp } from './timestamp'

/**
 * The highly confidential part of a leave request, apart from it because fewer people read it
 * (`human-resource-collections.md` 9.4).
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property request_id - The request; unique per tenant.
 * @property employee_id - The requester.
 * @property reason - The requester's reason, 1 to 1000 characters.
 * @property proof - Proof of the reason (a file reference only), or `null`.
 * @property created_by - Who created the record.
 */
export class LeaveRequestDetail extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  request_id!: string
  employee_id!: string
  reason!: string
  proof!: FileRef | null
  created_by!: ActorRef
}
