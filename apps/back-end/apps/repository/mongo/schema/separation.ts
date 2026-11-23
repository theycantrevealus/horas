import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import { type SeparationStatus } from '@repository/model/separation'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'
import { LeavePeriodEntity, LeavePeriodSchema } from './leave-ledger'

/**
 * Hydrated Mongoose document of a separation.
 */
export type SeparationDocument = HydratedDocument<SeparationEntity>

/**
 * Storage shape of who marked a checklist item done.
 *
 * @property by - Who.
 * @property at - When.
 */
@Schema({ _id: false })
export class ChecklistDoneEntity {
  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date
}

/**
 * Mongoose schema of a checklist completion.
 */
export const ChecklistDoneSchema = SchemaFactory.createForClass(ChecklistDoneEntity)

/**
 * Storage shape of one exit checklist item.
 *
 * @property item - The item code.
 * @property done - Who marked it done, or `null`.
 */
@Schema({ _id: false })
export class ChecklistItemEntity {
  @Prop({ type: CodingSchema, required: true })
  item!: Coding

  @Prop({ type: ChecklistDoneSchema, default: null })
  done!: ChecklistDoneEntity | null
}

/**
 * Mongoose schema of a checklist item.
 */
export const ChecklistItemSchema = SchemaFactory.createForClass(ChecklistItemEntity)

/**
 * Storage shape of the counts of what completion closed.
 */
@Schema({ _id: false })
export class CompletionCountsEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  assignments!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  sessions!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  leave_requests!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  appointments!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  memberships!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  position_assignments!: number
}

/**
 * Mongoose schema of the completion counts.
 */
export const CompletionCountsSchema = SchemaFactory.createForClass(CompletionCountsEntity)

/**
 * Storage shape of what completion did.
 *
 * @property at - When it ran.
 * @property by - Who or what ran it.
 * @property counts - What it closed.
 */
@Schema({ _id: false })
export class CompletionEntity {
  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date

  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: CompletionCountsSchema, required: true })
  counts!: CompletionCountsEntity
}

/**
 * Mongoose schema of the completion.
 */
export const CompletionSchema = SchemaFactory.createForClass(CompletionEntity)

/**
 * Storage shape of the leave days left of one yearly type.
 */
@Schema({ _id: false })
export class SettlementLeaveEntity {
  @Prop({ type: CodingSchema, required: true })
  leave_type!: Coding

  @Prop({ type: LeavePeriodSchema, required: true })
  period!: LeavePeriodEntity

  @Prop({ type: SchemaTypes.Number, required: true })
  days_left!: number
}

/**
 * Mongoose schema of one settled leave balance.
 */
export const SettlementLeaveSchema = SchemaFactory.createForClass(SettlementLeaveEntity)

/**
 * Storage shape of the settlement.
 */
@Schema({ _id: false })
export class SettlementEntity {
  @Prop({ type: [SettlementLeaveSchema], default: [] })
  leave!: SettlementLeaveEntity[]

  @Prop({ type: SchemaTypes.String, default: null })
  notes!: string | null
}

/**
 * Mongoose schema of the settlement.
 */
export const SettlementSchema = SchemaFactory.createForClass(SettlementEntity)

/**
 * Mongo storage shape of a `Separation`, in the collection `separations`. Only the Mongo
 * repository uses it.
 */
@Schema({
  collection: 'separations',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class SeparationEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  facility_id!: Types.ObjectId | null

  @Prop({ type: CodingSchema, required: true })
  type!: Coding

  @Prop({ type: SchemaTypes.String, enum: ['end', 'terminate'], required: true })
  contract_action!: 'end' | 'terminate'

  @Prop({ type: SchemaTypes.String, required: true })
  last_working_day!: string

  @Prop({ type: SchemaTypes.String, default: null })
  notice_received_on!: string | null

  @Prop({ type: SchemaTypes.Boolean, required: true })
  immediate!: boolean

  @Prop({
    type: SchemaTypes.String,
    enum: ['planned', 'completed', 'cancelled'],
    required: true,
  })
  status!: SeparationStatus

  @Prop({ type: SchemaTypes.Date, required: true })
  status_since!: Date

  @Prop({ type: CompletionSchema, default: null })
  completion!: CompletionEntity | null

  @Prop({ type: [ChecklistItemSchema], default: [] })
  checklist!: ChecklistItemEntity[]

  @Prop({ type: SettlementSchema, default: null })
  settlement!: SettlementEntity | null

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
 * Mongoose schema of a separation.
 */
export const SeparationSchema = SchemaFactory.createForClass(SeparationEntity)

// HR-SEP-001: one separation per employee that is not cancelled.
SeparationSchema.index(
  { tenant_id: 1, employee_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['planned', 'completed'] } },
  },
)
// Lists and the planning guard.
SeparationSchema.index({ tenant_id: 1, status: 1, last_working_day: 1 })
// The completion job reads across tenants, so this index does not start with `tenant_id`
// (`database.md` 7.2).
SeparationSchema.index({ status: 1, last_working_day: 1 })
