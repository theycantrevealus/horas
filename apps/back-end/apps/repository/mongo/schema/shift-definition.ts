import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ShiftType } from '@repository/model/shift-definition'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a shift definition.
 */
export type ShiftDefinitionDocument = HydratedDocument<ShiftDefinitionEntity>

/**
 * Mongo storage shape of a `ShiftDefinition`, in the collection `shift_definitions`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property facility_id - Facility that defines the shift.
 * @property code - Shift code, unique per facility.
 * @property name - Name per language.
 * @property type - Kind of shift.
 * @property start_time - Local start `HH:mm`, or `null` for an off shift.
 * @property end_time - Local end `HH:mm`, or `null` for an off shift.
 * @property paid_minutes - Working time counted.
 * @property is_night - Counts toward the consecutive-night limit.
 * @property unit_ids - Units that may use it; empty means all.
 * @property status - `retired` shifts cannot be assigned.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'shift_definitions',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class ShiftDefinitionEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['regular', 'on_call_onsite', 'on_call_remote', 'off'],
    required: true,
  })
  type!: ShiftType

  @Prop({ type: SchemaTypes.String, default: null })
  start_time!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  end_time!: string | null

  @Prop({ type: SchemaTypes.Number, required: true })
  paid_minutes!: number

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_night!: boolean

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  unit_ids!: Types.ObjectId[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'retired'],
    required: true,
  })
  status!: 'active' | 'retired'

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
 * Mongoose schema of the shift definition.
 */
export const ShiftDefinitionSchema =
  SchemaFactory.createForClass(ShiftDefinitionEntity)

// One code per facility, retired shifts included (HR plan 5.1 SH2).
ShiftDefinitionSchema.index(
  { tenant_id: 1, facility_id: 1, code: 1 },
  { unique: true },
)
ShiftDefinitionSchema.index({ tenant_id: 1, facility_id: 1, status: 1 })
ShiftDefinitionSchema.index({ tenant_id: 1, unit_ids: 1 })
