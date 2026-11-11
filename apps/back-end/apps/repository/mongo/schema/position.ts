import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a position.
 */
export type PositionDocument = HydratedDocument<PositionEntity>

/**
 * Mongo storage shape of a `Position`, in the collection `positions`. Only the Mongo repository
 * uses it; the rest of the application uses the `Position` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - Unit the position belongs to.
 * @property code - Unique code inside the unit.
 * @property title - Title per language.
 * @property kind - Structural or functional position.
 * @property is_head_of_unit - Whether this is the unit's head position.
 * @property allowed_professions - Professions that may fill it; empty for any.
 * @property grade - Job grade, or `null`.
 * @property budgeted_headcount - Number of people the position is budgeted for.
 * @property job_description - Job description document, or `null`.
 * @property period - When the position exists, or `null`.
 * @property status - Whether the position is in use.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'positions',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PositionEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  title!: LocalizedText[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['structural', 'functional'],
    required: true,
  })
  kind!: 'structural' | 'functional'

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_head_of_unit!: boolean

  @Prop({ type: [CodingSchema], default: [] })
  allowed_professions!: CodingEntity[]

  @Prop({ type: CodingSchema, default: null })
  grade!: CodingEntity | null

  @Prop({ type: SchemaTypes.Number, required: true })
  budgeted_headcount!: number

  @Prop({ type: SchemaTypes.Mixed, default: null })
  job_description!: FileRef | null

  @Prop({ type: DatePeriodSchema, default: null })
  period!: DatePeriodEntity | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'closed'],
    default: 'active',
  })
  status!: 'active' | 'closed'

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
 * Mongoose schema generated from `PositionEntity`.
 */
export const PositionSchema = SchemaFactory.createForClass(PositionEntity)

PositionSchema.index({ tenant_id: 1, unit_id: 1, code: 1 }, { unique: true })
// At most one active head position per unit; a partial index can only use equality filters.
PositionSchema.index(
  { tenant_id: 1, unit_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_head_of_unit: true, status: 'active' },
  },
)
PositionSchema.index({ tenant_id: 1, unit_id: 1, status: 1 })
