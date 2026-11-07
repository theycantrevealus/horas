import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type SecurityEventType } from '@repository/model/security-event'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a security event.
 */
export type SecurityEventDocument = HydratedDocument<SecurityEventEntity>

/**
 * Mongo storage shape of a security event. Pinned to `security_events`.
 * Not business data, so writes are not in the change history. A TTL index on `expires_at` enforces retention.
 */
@Schema({
  collection: 'security_events',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class SecurityEventEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  account_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, required: true })
  type!: SecurityEventType

  @Prop({ type: SchemaTypes.Date, required: true })
  occurred_at!: Date

  @Prop({ type: SchemaTypes.String, default: null })
  ip!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  user_agent_hash!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  correlation_id!: string | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['success', 'failure'],
    required: true,
  })
  outcome!: 'success' | 'failure'

  @Prop({ type: SchemaTypes.String, default: null })
  reason_code!: string | null

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
 * Mongoose schema generated from `SecurityEventEntity`.
 */
export const SecurityEventSchema =
  SchemaFactory.createForClass(SecurityEventEntity)

SecurityEventSchema.index({ tenant_id: 1, account_id: 1, occurred_at: -1 })
SecurityEventSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
