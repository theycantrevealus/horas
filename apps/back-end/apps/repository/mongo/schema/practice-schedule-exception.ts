import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a practice schedule exception.
 */
export type PracticeScheduleExceptionDocument =
  HydratedDocument<PracticeScheduleExceptionEntity>

/**
 * Storage shape of the new time of a moved session.
 *
 * @property date - New date.
 * @property start_time - New local start.
 * @property end_time - New local end.
 */
@Schema({ _id: false })
export class MovedSessionEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: SchemaTypes.String, required: true })
  start_time!: string

  @Prop({ type: SchemaTypes.String, required: true })
  end_time!: string
}

/**
 * Mongoose schema of the moved session.
 */
export const MovedSessionSchema = SchemaFactory.createForClass(MovedSessionEntity)

/**
 * Storage shape of where an exception came from.
 *
 * @property kind - Entered by hand, or created from leave or training.
 * @property ref_id - The leave or training, or `null`.
 */
@Schema({ _id: false })
export class ExceptionSourceEntity {
  @Prop({ type: SchemaTypes.String, enum: ['manual', 'leave', 'training'], required: true })
  kind!: 'manual' | 'leave' | 'training'

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  ref_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of the exception source.
 */
export const ExceptionSourceSchema = SchemaFactory.createForClass(ExceptionSourceEntity)

/**
 * Mongo storage shape of a `PracticeScheduleException`, in the collection
 * `practice_schedule_exceptions`. Only the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property schedule_id - The schedule.
 * @property employee_id - The doctor, copied from the schedule.
 * @property unit_id - The polyclinic, copied from the schedule.
 * @property date - Date of the affected session.
 * @property kind - Cancelled or moved.
 * @property moved_to - New time when moved, otherwise `null`.
 * @property reason - Leave, training, emergency, other.
 * @property source - Entered by hand, or created from leave or training.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'practice_schedule_exceptions',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PracticeScheduleExceptionEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  schedule_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: SchemaTypes.String, enum: ['cancelled', 'moved'], required: true })
  kind!: 'cancelled' | 'moved'

  @Prop({ type: MovedSessionSchema, default: null })
  moved_to!: MovedSessionEntity | null

  @Prop({ type: CodingSchema, required: true })
  reason!: Coding

  @Prop({ type: ExceptionSourceSchema, required: true })
  source!: ExceptionSourceEntity

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
 * Mongoose schema of the practice schedule exception.
 */
export const PracticeScheduleExceptionSchema = SchemaFactory.createForClass(
  PracticeScheduleExceptionEntity,
)

// One exception in force per schedule and date; an undone (soft-deleted) one does not count.
PracticeScheduleExceptionSchema.index(
  { tenant_id: 1, schedule_id: 1, date: 1 },
  { unique: true, partialFilterExpression: { deleted_at: { $type: 'null' } } },
)
// The exceptions of a polyclinic on a date.
PracticeScheduleExceptionSchema.index({ tenant_id: 1, unit_id: 1, date: 1 })
// A doctor's exceptions on a date, and the sessions moved onto a date.
PracticeScheduleExceptionSchema.index({ tenant_id: 1, employee_id: 1, date: 1 })
PracticeScheduleExceptionSchema.index({ tenant_id: 1, 'moved_to.date': 1, unit_id: 1 })
