import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a processed event.
 */
export type ProcessedEventDocument = HydratedDocument<ProcessedEventEntity>

/**
 * Mongo storage shape of a `ProcessedEvent`, in the collection `processed_events`. Only the Mongo
 * repository uses it. Not business data: it is not recorded in the change history.
 *
 * @property tenant_id - Tenant of the event.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property consumer - Name of the consumer.
 * @property event_id - Identifier of the event.
 * @property event_type - Name of the event.
 * @property processed_at - When the consumer handled it.
 * @property expires_at - End of the retention period.
 * @property created_by - Actor that caused the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null`.
 */
@Schema({
  collection: 'processed_events',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class ProcessedEventEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  consumer!: string

  @Prop({ type: SchemaTypes.String, required: true })
  event_id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  event_type!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  processed_at!: Date

  @Prop({ type: SchemaTypes.Date, required: true })
  expires_at!: Date

  @Prop({ type: ActorRefSchema, required: true })
  created_by!: ActorRef

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  created_at?: Date

  @Prop({ type: SchemaTypes.Date, default: () => new Date() })
  updated_at?: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  deleted_at?: Date | null
}

/**
 * Mongoose schema generated from `ProcessedEventEntity`.
 */
export const ProcessedEventSchema =
  SchemaFactory.createForClass(ProcessedEventEntity)

// A consumer handles an event once; a second record would mean the dedupe failed.
ProcessedEventSchema.index({ consumer: 1, event_id: 1 }, { unique: true })
// The TTL index removes a record when its retention period ends.
ProcessedEventSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
