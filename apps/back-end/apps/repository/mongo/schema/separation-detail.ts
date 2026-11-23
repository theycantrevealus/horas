import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a separation detail.
 */
export type SeparationDetailDocument = HydratedDocument<SeparationDetailEntity>

/**
 * Mongo storage shape of a `SeparationDetail`, in the collection `separation_details`.
 */
@Schema({
  collection: 'separation_details',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class SeparationDetailEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  separation_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  reason!: string

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
 * Mongoose schema of a separation detail.
 */
export const SeparationDetailSchema = SchemaFactory.createForClass(SeparationDetailEntity)

// One detail per separation.
SeparationDetailSchema.index({ tenant_id: 1, separation_id: 1 }, { unique: true })
