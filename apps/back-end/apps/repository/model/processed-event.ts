import { type Entity } from '@utility/database/interface'
import { type ActorRef } from '@utility/history/actor'
import { Timestamp } from './timestamp'

/**
 * Record that a consumer handled an event, so a redelivery does nothing
 * (`account-and-workforce-collections.md` 6.4). Not business data and not recorded in the change
 * history: entries expire `PROCESSED_EVENT_KEEP_DAYS` after they were written.
 *
 * @property tenant_id - Tenant of the event.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property consumer - Name of the consumer that handled the event.
 * @property event_id - Identifier of the event.
 * @property event_type - Name of the event, for operators.
 * @property processed_at - When the consumer handled it.
 * @property expires_at - End of the retention period.
 * @property created_by - Actor that caused the record.
 */
export class ProcessedEvent extends Timestamp implements Entity {
  id!: string
  tenant_id!: string
  schema_version!: number
  version!: number
  consumer!: string
  event_id!: string
  event_type!: string
  processed_at!: Date
  expires_at!: Date
  created_by!: ActorRef
}

/**
 * Days a processed-event record is kept. An event is never redelivered after it was marked
 * delivered, and retries happen within minutes, so 30 days outlives any redelivery.
 */
export const PROCESSED_EVENT_KEEP_DAYS = 30
