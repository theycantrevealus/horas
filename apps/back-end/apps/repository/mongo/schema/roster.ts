import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ClosedDatePeriod } from '@repository/model/common/calendar'
import { type RosterStatus } from '@repository/model/roster'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { ActorStampEntity, ActorStampSchema } from './common/actor-stamp'
import { DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a roster.
 */
export type RosterDocument = HydratedDocument<RosterEntity>

/**
 * Storage shape of one accepted coverage gap (group 5.5 fills it).
 *
 * @property date - The day of the gap.
 * @property shift_definition_id - The shift.
 * @property requirement_id - The requirement that is not met.
 * @property reason - Why the gap is accepted.
 * @property by - Who accepted it.
 * @property at - When.
 */
@Schema({ _id: false })
export class CoverageOverrideEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  shift_definition_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  requirement_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  reason!: string

  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date
}

/**
 * Mongoose schema of an accepted coverage gap.
 */
export const CoverageOverrideSchema =
  SchemaFactory.createForClass(CoverageOverrideEntity)

/**
 * Storage shape of the summary of the last validation (group 5.5 fills it).
 *
 * @property checked_at - When it ran.
 * @property violations - Rule violations found.
 * @property coverage_gaps - Coverage gaps found.
 */
@Schema({ _id: false })
export class RosterValidationEntity {
  @Prop({ type: SchemaTypes.Date, required: true })
  checked_at!: Date

  @Prop({ type: SchemaTypes.Number, required: true })
  violations!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  coverage_gaps!: number
}

/**
 * Mongoose schema of the validation summary.
 */
export const RosterValidationSchema = SchemaFactory.createForClass(
  RosterValidationEntity,
)

/**
 * Mongo storage shape of a `Roster`, in the collection `rosters`. Only the Mongo repository uses
 * it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - The unit.
 * @property facility_id - The unit's facility, copied at creation.
 * @property period - First and last day.
 * @property status - Where the roster is in its lifecycle.
 * @property revision - Increases on each published change.
 * @property prepared_by - Who prepared it.
 * @property submitted - Submission stamp, or `null`.
 * @property approved - Approval stamp, or `null`.
 * @property published - Publication stamp, or `null`.
 * @property closed - Closing stamp, or `null`.
 * @property return_reason - Why it was last returned, or `null`.
 * @property coverage_overrides - Accepted coverage gaps.
 * @property validation - Last validation summary, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'rosters',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class RosterEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: DatePeriodSchema, required: true })
  period!: ClosedDatePeriod

  @Prop({
    type: SchemaTypes.String,
    enum: ['draft', 'submitted', 'approved', 'published', 'closed'],
    required: true,
  })
  status!: RosterStatus

  @Prop({ type: SchemaTypes.Number, required: true })
  revision!: number

  @Prop({ type: ActorRefSchema, required: true })
  prepared_by!: ActorRef

  @Prop({ type: ActorStampSchema, default: null })
  submitted!: ActorStampEntity | null

  @Prop({ type: ActorStampSchema, default: null })
  approved!: ActorStampEntity | null

  @Prop({ type: ActorStampSchema, default: null })
  published!: ActorStampEntity | null

  @Prop({ type: ActorStampSchema, default: null })
  closed!: ActorStampEntity | null

  @Prop({ type: SchemaTypes.String, default: null })
  return_reason!: string | null

  @Prop({ type: [CoverageOverrideSchema], default: [] })
  coverage_overrides!: CoverageOverrideEntity[]

  @Prop({ type: RosterValidationSchema, default: null })
  validation!: RosterValidationEntity | null

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
 * Mongoose schema of the roster.
 */
export const RosterSchema = SchemaFactory.createForClass(RosterEntity)

// One roster per unit and start date (HR plan 5.4 RS4).
RosterSchema.index({ tenant_id: 1, unit_id: 1, 'period.start': 1 }, { unique: true })
RosterSchema.index({ tenant_id: 1, status: 1, 'period.start': 1 })
