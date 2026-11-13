import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type DecisionRef } from '@repository/model/common/decision'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a committee membership.
 */
export type CommitteeMembershipDocument =
  HydratedDocument<CommitteeMembershipEntity>

/**
 * Mongo storage shape of a `CommitteeMembership`, in the collection `committee_memberships`. Only
 * the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The member.
 * @property facility_id - Facility whose committee it is.
 * @property committee - Committee code.
 * @property role - Role code.
 * @property period - Membership dates.
 * @property decision_ref - Decision (SK) reference, or `null`.
 * @property status - `active` or `ended`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'committee_memberships',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CommitteeMembershipEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  committee!: CodingEntity

  @Prop({ type: CodingSchema, required: true })
  role!: CodingEntity

  @Prop({ type: DatePeriodSchema, required: true })
  period!: DatePeriodEntity

  @Prop({ type: SchemaTypes.Mixed, default: null })
  decision_ref!: DecisionRef | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'ended'],
    required: true,
  })
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
 * Mongoose schema generated from `CommitteeMembershipEntity`.
 */
export const CommitteeMembershipSchema = SchemaFactory.createForClass(
  CommitteeMembershipEntity,
)

// One active role per person per committee of a facility (HR plan 2.5 M5).
CommitteeMembershipSchema.index(
  { tenant_id: 1, employee_id: 1, facility_id: 1, 'committee.code': 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
)
// One active chair and one active secretary per committee of a facility (M6). Partial filters
// accept equality only, so each role has its own index.
for (const role of ['chair', 'secretary']) {
  CommitteeMembershipSchema.index(
    { tenant_id: 1, facility_id: 1, 'committee.code': 1 },
    {
      unique: true,
      name: `unique_active_${role}`,
      partialFilterExpression: { status: 'active', 'role.code': role },
    },
  )
}
CommitteeMembershipSchema.index({
  tenant_id: 1,
  facility_id: 1,
  'committee.code': 1,
  status: 1,
})
