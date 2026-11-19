import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a leave request detail.
 */
export type LeaveRequestDetailDocument = HydratedDocument<LeaveRequestDetailEntity>

/**
 * Mongo storage shape of a `LeaveRequestDetail`, in the collection `leave_request_details`. Only
 * the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property request_id - The request.
 * @property employee_id - The requester.
 * @property reason - The requester's reason.
 * @property proof - Proof (a file reference), or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'leave_request_details',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class LeaveRequestDetailEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  request_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  reason!: string

  @Prop({ type: SchemaTypes.Mixed, default: null })
  proof!: FileRef | null

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
 * Mongoose schema of the leave request detail.
 */
export const LeaveRequestDetailSchema = SchemaFactory.createForClass(LeaveRequestDetailEntity)

// One detail per request.
LeaveRequestDetailSchema.index({ tenant_id: 1, request_id: 1 }, { unique: true })
