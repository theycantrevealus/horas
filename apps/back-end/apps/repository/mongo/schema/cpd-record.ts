import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a CPD record.
 */
export type CpdRecordDocument = HydratedDocument<CpdRecordEntity>

/**
 * Mongo storage shape of the activity that earned the credits.
 *
 * @property title - Activity title.
 * @property category - Activity category code.
 * @property provider - Organizer, or `null`.
 */
@Schema({ _id: false })
export class CpdActivityEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  title!: string

  @Prop({ type: CodingSchema, required: true })
  category!: CodingEntity

  @Prop({ type: SchemaTypes.String, default: null })
  provider!: string | null
}

/**
 * Mongoose schema of the embedded activity.
 */
export const CpdActivitySchema =
  SchemaFactory.createForClass(CpdActivityEntity)

/**
 * Mongo storage shape of a `CpdRecord`, in the collection `cpd_records`. Only the Mongo
 * repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Who earned the points.
 * @property credit_system - Credit system code.
 * @property activity - What was done.
 * @property activity_date - When it was done.
 * @property points - Points, with at most two decimals.
 * @property evidence - Proof, or `null`.
 * @property source - Where the record came from.
 * @property status - Review status.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'cpd_records',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CpdRecordEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  credit_system!: CodingEntity

  @Prop({ type: CpdActivitySchema, required: true })
  activity!: CpdActivityEntity

  @Prop({ type: SchemaTypes.String, required: true })
  activity_date!: string

  @Prop({ type: SchemaTypes.Number, required: true })
  points!: number

  @Prop({ type: SchemaTypes.Mixed, default: null })
  evidence!: FileRef | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['manual', 'training_record', 'external_platform'],
    required: true,
  })
  source!: 'manual' | 'training_record' | 'external_platform'

  @Prop({
    type: SchemaTypes.String,
    enum: ['submitted', 'accepted', 'rejected'],
    required: true,
  })
  status!: 'submitted' | 'accepted' | 'rejected'

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
 * Mongoose schema generated from `CpdRecordEntity`.
 */
export const CpdRecordSchema = SchemaFactory.createForClass(CpdRecordEntity)

CpdRecordSchema.index({
  tenant_id: 1,
  employee_id: 1,
  'credit_system.code': 1,
  activity_date: 1,
})
CpdRecordSchema.index({ tenant_id: 1, employee_id: 1, status: 1 })
