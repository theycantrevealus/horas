import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a CPD summary.
 */
export type CpdSummaryDocument = HydratedDocument<CpdSummaryEntity>

/**
 * Mongo storage shape of a `CpdSummary`, in the collection `cpd_summaries`. Only the Mongo
 * repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee.
 * @property credit_system - Credit system code.
 * @property profession - Profession the requirement depends on.
 * @property cycle - Counting period.
 * @property total_points - Total in the cycle.
 * @property checked_at - When the total was read.
 * @property source - Computed or read from a national platform.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'cpd_summaries',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CpdSummaryEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  credit_system!: CodingEntity

  @Prop({ type: CodingSchema, required: true })
  profession!: CodingEntity

  @Prop({ type: DatePeriodSchema, required: true })
  cycle!: DatePeriodEntity

  @Prop({ type: SchemaTypes.Number, required: true })
  total_points!: number

  @Prop({ type: SchemaTypes.Date, required: true })
  checked_at!: Date

  @Prop({
    type: SchemaTypes.String,
    enum: ['computed', 'external_platform'],
    required: true,
  })
  source!: 'computed' | 'external_platform'

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
 * Mongoose schema generated from `CpdSummaryEntity`.
 */
export const CpdSummarySchema = SchemaFactory.createForClass(CpdSummaryEntity)

// One summary per employee and credit system.
CpdSummarySchema.index(
  {
    tenant_id: 1,
    employee_id: 1,
    'credit_system.system': 1,
    'credit_system.code': 1,
  },
  { unique: true },
)
