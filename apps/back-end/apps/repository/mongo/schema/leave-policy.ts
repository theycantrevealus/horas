import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a leave policy.
 */
export type LeavePolicyDocument = HydratedDocument<LeavePolicyEntity>

/**
 * Storage shape of the days a `period` policy carries into the next period.
 *
 * @property max_days - Most days that move on.
 * @property expires_after_months - Months the carried days stay usable.
 */
@Schema({ _id: false })
export class LeaveCarryOverEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  max_days!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  expires_after_months!: number
}

/**
 * Mongoose schema of the carry-over rule.
 */
export const LeaveCarryOverSchema =
  SchemaFactory.createForClass(LeaveCarryOverEntity)

/**
 * Storage shape of the balance rule. One shape for the three kinds: fields that do not belong to
 * the kind are not stored.
 *
 * @property kind - `period`, `per_event` or `none`.
 * @property period - For `period`: `calendar_year` or `service_year`.
 * @property days - Days per period, or per event.
 * @property min_service_months - For `period`: months of service before the first entitlement.
 * @property carry_over - For `period`: carry-over rule, or `null`.
 * @property deduct_collective_leave - For `period`: collective leave is taken from the balance.
 */
@Schema({ _id: false })
export class LeaveBalanceRuleEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['period', 'per_event', 'none'],
    required: true,
  })
  kind!: 'period' | 'per_event' | 'none'

  @Prop({ type: SchemaTypes.String, enum: ['calendar_year', 'service_year'] })
  period?: 'calendar_year' | 'service_year'

  @Prop({ type: SchemaTypes.Number })
  days?: number

  @Prop({ type: SchemaTypes.Number })
  min_service_months?: number

  @Prop({ type: LeaveCarryOverSchema, default: undefined })
  carry_over?: LeaveCarryOverEntity | null

  @Prop({ type: SchemaTypes.Boolean })
  deduct_collective_leave?: boolean
}

/**
 * Mongoose schema of the balance rule.
 */
export const LeaveBalanceRuleSchema = SchemaFactory.createForClass(
  LeaveBalanceRuleEntity,
)

/**
 * Storage shape of the approval rule.
 *
 * @property steps - `one_step` or `two_step`.
 * @property two_step_above_days - Days above which a one-step policy needs two steps, or `null`.
 */
@Schema({ _id: false })
export class LeaveApprovalRuleEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['one_step', 'two_step'],
    required: true,
  })
  steps!: 'one_step' | 'two_step'

  @Prop({ type: SchemaTypes.Number, default: null })
  two_step_above_days!: number | null
}

/**
 * Mongoose schema of the approval rule.
 */
export const LeaveApprovalRuleSchema = SchemaFactory.createForClass(
  LeaveApprovalRuleEntity,
)

/**
 * Storage shape of the proof rule.
 *
 * @property due_days - Days after the first leave date the proof is due.
 */
@Schema({ _id: false })
export class LeaveProofRuleEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  due_days!: number
}

/**
 * Mongoose schema of the proof rule.
 */
export const LeaveProofRuleSchema =
  SchemaFactory.createForClass(LeaveProofRuleEntity)

/**
 * Storage shape of where a policy came from.
 *
 * @property kind - Entered by hand, or loaded from a bundle.
 * @property bundle_id - Name of the bundle, or `null`.
 */
@Schema({ _id: false })
export class LeavePolicySourceEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['manual', 'bundle'],
    required: true,
  })
  kind!: 'manual' | 'bundle'

  @Prop({ type: SchemaTypes.String, default: null })
  bundle_id!: string | null
}

/**
 * Mongoose schema of the source.
 */
export const LeavePolicySourceSchema = SchemaFactory.createForClass(
  LeavePolicySourceEntity,
)

/**
 * Mongo storage shape of a `LeavePolicy`, in the collection `leave_policies`. Only the Mongo
 * repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property leave_type - The leave type.
 * @property effective_from - First date this version applies.
 * @property balance - How days are granted.
 * @property counting - Working days or calendar days.
 * @property half_days - Whether half days may be requested.
 * @property paid - Whether the leave is paid.
 * @property employment_types - Employment types that may use it; empty means all.
 * @property approval - One or two approval steps.
 * @property notice_days - Days of notice before the first leave day.
 * @property retroactive_days - Days after the start the leave may still be requested.
 * @property max_days_per_request - Most days of one request.
 * @property proof - Proof rule, or `null`.
 * @property notes - Legal basis.
 * @property source - Entered by hand or from a bundle.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'leave_policies',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class LeavePolicyEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: CodingSchema, required: true })
  leave_type!: Coding

  @Prop({ type: SchemaTypes.String, required: true })
  effective_from!: string

  @Prop({ type: LeaveBalanceRuleSchema, required: true })
  balance!: LeaveBalanceRuleEntity

  @Prop({
    type: SchemaTypes.String,
    enum: ['working_days', 'calendar_days'],
    required: true,
  })
  counting!: 'working_days' | 'calendar_days'

  @Prop({ type: SchemaTypes.Boolean, required: true })
  half_days!: boolean

  @Prop({ type: SchemaTypes.Boolean, required: true })
  paid!: boolean

  @Prop({ type: [CodingSchema], default: [] })
  employment_types!: Coding[]

  @Prop({ type: LeaveApprovalRuleSchema, required: true })
  approval!: LeaveApprovalRuleEntity

  @Prop({ type: SchemaTypes.Number, required: true })
  notice_days!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  retroactive_days!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  max_days_per_request!: number

  @Prop({ type: LeaveProofRuleSchema, default: null })
  proof!: LeaveProofRuleEntity | null

  @Prop({ type: SchemaTypes.String, default: null })
  notes!: string | null

  @Prop({ type: LeavePolicySourceSchema, required: true })
  source!: LeavePolicySourceEntity

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
 * Mongoose schema of the leave policy.
 */
export const LeavePolicySchema = SchemaFactory.createForClass(LeavePolicyEntity)

// One version of a leave type per start date, which makes "the version in force" unambiguous
// (HR plan 8.1 LP2).
LeavePolicySchema.index(
  {
    tenant_id: 1,
    'leave_type.system': 1,
    'leave_type.code': 1,
    effective_from: 1,
  },
  { unique: true },
)
