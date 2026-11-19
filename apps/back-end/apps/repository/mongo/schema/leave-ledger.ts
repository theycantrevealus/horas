import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import {
  type LeaveLedgerEntry,
  type LeaveLedgerKind,
} from '@repository/model/leave-ledger-entry'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a leave ledger entry.
 */
export type LeaveLedgerEntryDocument = HydratedDocument<LeaveLedgerEntryEntity>

/**
 * Storage shape of an entitlement period.
 *
 * @property start - First day.
 * @property end - Last day.
 */
@Schema({ _id: false })
export class LeavePeriodEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  start!: string

  @Prop({ type: SchemaTypes.String, required: true })
  end!: string
}

/**
 * Mongoose schema of the entitlement period.
 */
export const LeavePeriodSchema = SchemaFactory.createForClass(LeavePeriodEntity)

/**
 * Storage shape of what posted an entry.
 *
 * @property kind - Request, job, HR adjustment or collective leave day.
 * @property ref_id - The request, for a `request` entry; otherwise `null`.
 * @property date - The collective leave date, for a `collective_leave` entry; otherwise `null`.
 */
@Schema({ _id: false })
export class LeaveLedgerSourceEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['request', 'job', 'adjustment', 'collective_leave'],
    required: true,
  })
  kind!: LeaveLedgerEntry['source']['kind']

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  ref_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, default: null })
  date!: string | null
}

/**
 * Mongoose schema of the source.
 */
export const LeaveLedgerSourceSchema = SchemaFactory.createForClass(
  LeaveLedgerSourceEntity,
)

/**
 * Mongo storage shape of a `LeaveLedgerEntry`, in the collection `leave_ledger_entries`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee the days belong to.
 * @property leave_type - The leave type.
 * @property period - The entitlement period.
 * @property kind - What the entry does.
 * @property days - Signed days.
 * @property bucket - Own days or carried-over days.
 * @property expires_on - Last day of carried-over days.
 * @property source - What posted the entry.
 * @property dedupe_key - Makes jobs idempotent; `null` for request and adjustment entries.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'leave_ledger_entries',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class LeaveLedgerEntryEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  leave_type!: Coding

  @Prop({ type: LeavePeriodSchema, required: true })
  period!: LeavePeriodEntity

  @Prop({
    type: SchemaTypes.String,
    enum: ['grant', 'use', 'reversal', 'adjustment', 'carry_over', 'expiry'],
    required: true,
  })
  kind!: LeaveLedgerKind

  @Prop({ type: SchemaTypes.Number, required: true })
  days!: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['own', 'carry_over'],
    required: true,
  })
  bucket!: 'own' | 'carry_over'

  @Prop({ type: SchemaTypes.String, default: null })
  expires_on!: string | null

  @Prop({ type: LeaveLedgerSourceSchema, required: true })
  source!: LeaveLedgerSourceEntity

  @Prop({ type: SchemaTypes.String, default: null })
  dedupe_key!: string | null

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
 * Mongoose schema of the leave ledger entry.
 */
export const LeaveLedgerEntrySchema = SchemaFactory.createForClass(
  LeaveLedgerEntryEntity,
)

// The balance of one employee, leave type and period (HR plan 8.2 LB6).
LeaveLedgerEntrySchema.index({
  tenant_id: 1,
  employee_id: 1,
  'leave_type.code': 1,
  'period.start': 1,
})
// A job posts an entry once: a second try with the same key is a duplicate. Entries without a key
// (requests and adjustments) are not limited.
LeaveLedgerEntrySchema.index(
  { tenant_id: 1, dedupe_key: 1 },
  { unique: true, partialFilterExpression: { dedupe_key: { $type: 'string' } } },
)
// The leave period job reads across tenants, so these indexes do not start with `tenant_id`
// (`database.md` 7.2): the grants whose period ended in a window, and the carry-overs that expire
// in a window.
LeaveLedgerEntrySchema.index({ kind: 1, 'period.end': 1 })
LeaveLedgerEntrySchema.index({ kind: 1, expires_on: 1 })
