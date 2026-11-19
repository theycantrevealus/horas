import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import {
  type LeaveDay,
  type LeaveDayReason,
  type LeaveDaySource,
  type LeaveRequestRules,
  type LeaveRequestStatus,
} from '@repository/model/leave-request'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'
import { LeavePeriodEntity, LeavePeriodSchema } from './leave-ledger'

/**
 * Hydrated Mongoose document of a leave request.
 */
export type LeaveRequestDocument = HydratedDocument<LeaveRequestEntity>

/**
 * Storage shape of the rules a request is decided under.
 *
 * @property balance_kind - Yearly, per event, or none.
 * @property counting - Working days or calendar days.
 * @property steps - One or two approval steps.
 */
@Schema({ _id: false })
export class LeaveRequestRulesEntity {
  @Prop({ type: SchemaTypes.String, enum: ['period', 'per_event', 'none'], required: true })
  balance_kind!: LeaveRequestRules['balance_kind']

  @Prop({ type: SchemaTypes.String, enum: ['working_days', 'calendar_days'], required: true })
  counting!: LeaveRequestRules['counting']

  @Prop({ type: SchemaTypes.String, enum: ['one_step', 'two_step'], required: true })
  steps!: LeaveRequestRules['steps']
}

/**
 * Mongoose schema of the rules snapshot.
 */
export const LeaveRequestRulesSchema = SchemaFactory.createForClass(LeaveRequestRulesEntity)

/**
 * Storage shape of a half first or last day.
 *
 * @property first - The first day is a half day.
 * @property last - The last day is a half day.
 */
@Schema({ _id: false })
export class LeaveHalfDaysEntity {
  @Prop({ type: SchemaTypes.Boolean, required: true })
  first!: boolean

  @Prop({ type: SchemaTypes.Boolean, required: true })
  last!: boolean
}

/**
 * Mongoose schema of the half days.
 */
export const LeaveHalfDaysSchema = SchemaFactory.createForClass(LeaveHalfDaysEntity)

/**
 * Storage shape of one date of the leave.
 *
 * @property date - The local date.
 * @property count - 1, 0.5 or 0.
 * @property why - Why it counts or not.
 * @property set_by - What decided the count.
 */
@Schema({ _id: false })
export class LeaveDayEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: SchemaTypes.Number, required: true })
  count!: LeaveDay['count']

  @Prop({ type: SchemaTypes.String, enum: ['working', 'rest_day', 'holiday', 'collective_leave', 'calendar_day'], required: true })
  why!: LeaveDayReason

  @Prop({ type: SchemaTypes.String, enum: ['roster', 'working_week', 'head', 'policy'], required: true })
  set_by!: LeaveDaySource
}

/**
 * Mongoose schema of one day.
 */
export const LeaveDaySchema = SchemaFactory.createForClass(LeaveDayEntity)

/**
 * Storage shape of who decides the first step.
 *
 * @property kind - Unit Head, parent unit Head or HR Manager.
 * @property unit_id - The unit whose Head decides, or `null`.
 * @property employee_id - The Head found when the step is decided, or `null`.
 */
@Schema({ _id: false })
export class LeaveFirstDeciderEntity {
  @Prop({ type: SchemaTypes.String, enum: ['unit_head', 'parent_head', 'hr_manager'], required: true })
  kind!: 'unit_head' | 'parent_head' | 'hr_manager'

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  unit_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  employee_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of the first decider.
 */
export const LeaveFirstDeciderSchema = SchemaFactory.createForClass(LeaveFirstDeciderEntity)

/**
 * Storage shape of the deciders.
 *
 * @property first - Who decides the first step.
 * @property second - Whether HR Manager gives a second approval.
 */
@Schema({ _id: false })
export class LeaveDecidersEntity {
  @Prop({ type: LeaveFirstDeciderSchema, required: true })
  first!: LeaveFirstDeciderEntity

  @Prop({ type: SchemaTypes.Boolean, required: true })
  second!: boolean
}

/**
 * Mongoose schema of the deciders.
 */
export const LeaveDecidersSchema = SchemaFactory.createForClass(LeaveDecidersEntity)

/**
 * Storage shape of the replacement.
 *
 * @property employee_id - The replacement, or `null`.
 * @property none_reason - Why there is none, or `null`.
 */
@Schema({ _id: false })
export class LeaveReplacementEntity {
  @Prop({ type: SchemaTypes.ObjectId, default: null })
  employee_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, default: null })
  none_reason!: string | null
}

/**
 * Mongoose schema of the replacement.
 */
export const LeaveReplacementSchema = SchemaFactory.createForClass(LeaveReplacementEntity)

/**
 * Storage shape of one decision.
 *
 * @property step - First or second step.
 * @property outcome - Approved or rejected.
 * @property by - Who decided.
 * @property at - When.
 * @property reason - The reason of a rejection, or `null`.
 */
@Schema({ _id: false })
export class LeaveDecisionEntity {
  @Prop({ type: SchemaTypes.String, enum: ['first', 'second'], required: true })
  step!: 'first' | 'second'

  @Prop({ type: SchemaTypes.String, enum: ['approved', 'rejected'], required: true })
  outcome!: 'approved' | 'rejected'

  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: SchemaTypes.String, default: null })
  reason!: string | null
}

/**
 * Mongoose schema of one decision.
 */
export const LeaveDecisionSchema = SchemaFactory.createForClass(LeaveDecisionEntity)

/**
 * Storage shape of the confirmation of a cover.
 *
 * @property by - Who confirmed it.
 * @property at - When.
 * @property created_assignment_ids - The assignments created.
 */
@Schema({ _id: false })
export class LeaveCoverConfirmationEntity {
  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  created_assignment_ids!: Types.ObjectId[]
}

/**
 * Mongoose schema of the cover confirmation.
 */
export const LeaveCoverConfirmationSchema = SchemaFactory.createForClass(LeaveCoverConfirmationEntity)

/**
 * Storage shape of the cover of cancelled shifts.
 *
 * @property cancelled_assignment_ids - Shifts cancelled by the approval.
 * @property confirmed - The confirmation, or `null`.
 */
@Schema({ _id: false })
export class LeaveCoverEntity {
  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  cancelled_assignment_ids!: Types.ObjectId[]

  @Prop({ type: LeaveCoverConfirmationSchema, default: null })
  confirmed!: LeaveCoverConfirmationEntity | null
}

/**
 * Mongoose schema of the cover.
 */
export const LeaveCoverSchema = SchemaFactory.createForClass(LeaveCoverEntity)

/**
 * Mongo storage shape of a `LeaveRequest`, in the collection `leave_requests`. Only the Mongo
 * repository uses it. The fields are those of the model; identifiers are ObjectIds.
 */
@Schema({
  collection: 'leave_requests',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class LeaveRequestEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  unit_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  facility_id!: Types.ObjectId | null

  @Prop({ type: CodingSchema, required: true })
  leave_type!: Coding

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  policy_id!: Types.ObjectId

  @Prop({ type: LeaveRequestRulesSchema, required: true })
  rules!: LeaveRequestRulesEntity

  @Prop({ type: LeavePeriodSchema, required: true })
  period!: LeavePeriodEntity

  @Prop({ type: LeaveHalfDaysSchema, required: true })
  half_days!: LeaveHalfDaysEntity

  @Prop({ type: [LeaveDaySchema], default: [] })
  days!: LeaveDayEntity[]

  @Prop({ type: SchemaTypes.Number, required: true })
  total_days!: number

  @Prop({ type: LeavePeriodSchema, default: null })
  entitlement_period!: LeavePeriodEntity | null

  @Prop({ type: LeaveDecidersSchema, required: true })
  deciders!: LeaveDecidersEntity

  @Prop({ type: LeaveReplacementSchema, default: null })
  replacement!: LeaveReplacementEntity | null

  @Prop({ type: [LeaveDecisionSchema], default: [] })
  decisions!: LeaveDecisionEntity[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['requested', 'head_approved', 'approved', 'rejected', 'cancelled'],
    required: true,
  })
  status!: LeaveRequestStatus

  @Prop({ type: SchemaTypes.Date, required: true })
  status_since!: Date

  @Prop({ type: SchemaTypes.String, default: null })
  proof_due_on!: string | null

  @Prop({ type: SchemaTypes.Boolean, required: true })
  proof_received!: boolean

  @Prop({ type: LeaveCoverSchema, default: null })
  cover!: LeaveCoverEntity | null

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
 * Mongoose schema of the leave request.
 */
export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequestEntity)

// Overlap (`HR-LEV-002`), the employee's own list and the leave check of rostering.
LeaveRequestSchema.index({ tenant_id: 1, employee_id: 1, 'period.start': 1 })
// Whether a request was made under a policy version (HR plan 8.3 LR14).
LeaveRequestSchema.index({ tenant_id: 1, policy_id: 1 })
// The Head's queue.
LeaveRequestSchema.index({ tenant_id: 1, 'deciders.first.unit_id': 1, status: 1 })
// HR Manager's queue and the decision SLA alert.
LeaveRequestSchema.index({ tenant_id: 1, status: 1, created_at: 1 })
// Proof overdue: only requests whose proof has not been received.
LeaveRequestSchema.index(
  { tenant_id: 1, status: 1, proof_due_on: 1 },
  { partialFilterExpression: { proof_received: false } },
)
