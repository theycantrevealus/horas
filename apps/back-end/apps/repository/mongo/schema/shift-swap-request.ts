import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type SwapStatus } from '@repository/model/shift-swap-request'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a shift swap request.
 */
export type ShiftSwapRequestDocument = HydratedDocument<ShiftSwapRequestEntity>

/**
 * Storage shape of one side of a swap.
 *
 * @property employee_id - The person.
 * @property assignment_id - Their assignment, or `null` when the counterpart gives none.
 */
@Schema({ _id: false })
export class SwapPartyEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  assignment_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of one side of a swap.
 */
export const SwapPartySchema = SchemaFactory.createForClass(SwapPartyEntity)

/**
 * Storage shape of the Head of Unit's decision.
 *
 * @property by - Who decided.
 * @property at - When.
 * @property reason - Reason, or `null`.
 */
@Schema({ _id: false })
export class SwapDecisionEntity {
  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: SchemaTypes.String, default: null })
  reason!: string | null
}

/**
 * Mongoose schema of the decision.
 */
export const SwapDecisionSchema = SchemaFactory.createForClass(SwapDecisionEntity)

/**
 * Mongo storage shape of a `ShiftSwapRequest`, in the collection `shift_swap_requests`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - Unit of the roster.
 * @property roster_id - The roster.
 * @property requester - Who asks, with their assignment.
 * @property counterpart - Who takes over.
 * @property reason - Why.
 * @property status - Current status.
 * @property counterpart_accepted_at - When the counterpart accepted, or `null`.
 * @property decision - The decision of the Head of Unit, or `null`.
 * @property resulting_assignment_ids - Assignments created on approval.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'shift_swap_requests',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class ShiftSwapRequestEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  roster_id!: Types.ObjectId

  @Prop({ type: SwapPartySchema, required: true })
  requester!: SwapPartyEntity

  @Prop({ type: SwapPartySchema, default: null })
  counterpart!: SwapPartyEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  reason!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['requested', 'accepted_by_counterpart', 'approved', 'rejected', 'cancelled'],
    required: true,
  })
  status!: SwapStatus

  @Prop({ type: SchemaTypes.Date, default: null })
  counterpart_accepted_at!: Date | null

  @Prop({ type: SwapDecisionSchema, default: null })
  decision!: SwapDecisionEntity | null

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  resulting_assignment_ids!: Types.ObjectId[]

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
 * Mongoose schema of the shift swap request.
 */
export const ShiftSwapRequestSchema = SchemaFactory.createForClass(
  ShiftSwapRequestEntity,
)

// The Head of Unit's queue of a unit.
ShiftSwapRequestSchema.index({ tenant_id: 1, unit_id: 1, status: 1 })
// The counterpart's inbox.
ShiftSwapRequestSchema.index({ tenant_id: 1, 'counterpart.employee_id': 1, status: 1 })
// The requester's own list.
ShiftSwapRequestSchema.index({ tenant_id: 1, 'requester.employee_id': 1, status: 1 })
// The open request of an assignment.
ShiftSwapRequestSchema.index({ tenant_id: 1, 'requester.assignment_id': 1, status: 1 })
ShiftSwapRequestSchema.index({ tenant_id: 1, 'counterpart.assignment_id': 1, status: 1 })
