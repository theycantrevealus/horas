import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a practice schedule.
 */
export type PracticeScheduleDocument = HydratedDocument<PracticeScheduleEntity>

/**
 * Mongo storage shape of a `PracticeSchedule`, in the collection `practice_schedules`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The doctor.
 * @property unit_id - The polyclinic.
 * @property facility_id - Facility of the polyclinic.
 * @property day_of_week - ISO weekday, 1 to 7.
 * @property start_time - Local start `HH:mm`.
 * @property end_time - Local end `HH:mm`.
 * @property quota - Most patients per session, or `null` for no limit.
 * @property period - Validity.
 * @property status - `active` or `ended`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'practice_schedules',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PracticeScheduleEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true, min: 1, max: 7 })
  day_of_week!: number

  @Prop({ type: SchemaTypes.String, required: true })
  start_time!: string

  @Prop({ type: SchemaTypes.String, required: true })
  end_time!: string

  @Prop({ type: SchemaTypes.Number, default: null })
  quota!: number | null

  @Prop({ type: DatePeriodSchema, required: true })
  period!: DatePeriod

  @Prop({ type: SchemaTypes.String, enum: ['active', 'ended'], required: true })
  status!: 'active' | 'ended'

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
 * Mongoose schema of the practice schedule.
 */
export const PracticeScheduleSchema = SchemaFactory.createForClass(
  PracticeScheduleEntity,
)

// Registration: who practises in a polyclinic on a weekday.
PracticeScheduleSchema.index({ tenant_id: 1, unit_id: 1, day_of_week: 1, status: 1 })
// The doctor's schedules, and the overlap check across polyclinics.
PracticeScheduleSchema.index({ tenant_id: 1, employee_id: 1, status: 1 })
