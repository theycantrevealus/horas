import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type DecisionRef } from '@repository/model/common/decision'
import { type AssignmentStatus } from '@repository/model/position-assignment'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a position assignment.
 */
export type PositionAssignmentDocument =
  HydratedDocument<PositionAssignmentEntity>

/**
 * Mongo storage shape of a `PositionAssignment`, in the collection `position_assignments`. Only
 * the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee.
 * @property contract_id - Contract the assignment runs under.
 * @property position_id - The position.
 * @property unit_id - Unit of the position, copied at creation.
 * @property facility_id - Facility of the position, copied at creation.
 * @property is_primary - Whether this is the employee's primary assignment.
 * @property is_head_of_unit - Copied from the position.
 * @property kind - Assignment kind code.
 * @property period - Assignment dates.
 * @property fte - Full-time equivalent.
 * @property status - Lifecycle status.
 * @property is_open - True while `planned` or `active`.
 * @property decision_ref - Decision (SK) reference, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'position_assignments',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PositionAssignmentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  contract_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  position_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_primary!: boolean

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_head_of_unit!: boolean

  @Prop({ type: CodingSchema, required: true })
  kind!: CodingEntity

  @Prop({ type: DatePeriodSchema, required: true })
  period!: DatePeriodEntity

  @Prop({ type: SchemaTypes.Number, required: true })
  fte!: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['planned', 'active', 'ended'],
    required: true,
  })
  status!: AssignmentStatus

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_open!: boolean

  @Prop({ type: SchemaTypes.Mixed, default: null })
  decision_ref!: DecisionRef | null

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
 * Mongoose schema generated from `PositionAssignmentEntity`.
 */
export const PositionAssignmentSchema = SchemaFactory.createForClass(
  PositionAssignmentEntity,
)

// One open primary assignment per employee. Partial filters use equality only, hence `is_open`.
PositionAssignmentSchema.index(
  { tenant_id: 1, employee_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_primary: true, is_open: true },
  },
)
// One open holder per head-of-unit position.
PositionAssignmentSchema.index(
  { tenant_id: 1, unit_id: 1 },
  {
    unique: true,
    partialFilterExpression: { is_head_of_unit: true, is_open: true },
  },
)
PositionAssignmentSchema.index({
  tenant_id: 1,
  unit_id: 1,
  status: 1,
  'period.start': 1,
})
PositionAssignmentSchema.index({ tenant_id: 1, employee_id: 1, is_open: 1 })
PositionAssignmentSchema.index({ tenant_id: 1, position_id: 1, is_open: 1 })
