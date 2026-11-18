import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import { type StatusDecision } from '@repository/model/common/decision'
import {
  type GrantFlag,
  type PrivilegeGrantStatus,
} from '@repository/model/privilege-grant'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a privilege grant.
 */
export type PrivilegeGrantDocument = HydratedDocument<PrivilegeGrantEntity>

/**
 * Mongo storage shape of the supervisor of a supervised grant.
 *
 * @property employee_id - The supervisor.
 * @property grant_id - The supervisor's own grant of the same privilege.
 */
@Schema({ _id: false })
export class GrantSupervisorEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  grant_id!: Types.ObjectId
}

/**
 * Mongoose schema of the embedded supervisor.
 */
export const GrantSupervisorSchema = SchemaFactory.createForClass(
  GrantSupervisorEntity,
)

/**
 * Mongo storage shape of a `PrivilegeGrant`, in the collection `privilege_grants`. Only the Mongo
 * repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property appointment_id - The SPK.
 * @property employee_id - Practitioner.
 * @property facility_ids - Facilities covered by the SPK.
 * @property unit_ids - Units covered by the SPK.
 * @property catalog_item_id - The privilege.
 * @property code - Snapshot of the catalog code.
 * @property condition - How it may be performed.
 * @property supervisor - Supervisor, or `null`.
 * @property restriction_notes - Restrictions, or `null`.
 * @property status - Whether the grant is in force.
 * @property status_change - Latest suspension or revocation, or `null`.
 * @property flag - Open warning, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'privilege_grants',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PrivilegeGrantEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  appointment_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: [SchemaTypes.ObjectId], required: true })
  facility_ids!: Types.ObjectId[]

  @Prop({ type: [SchemaTypes.ObjectId], required: true })
  unit_ids!: Types.ObjectId[]

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  catalog_item_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['full', 'supervised', 'restricted'],
    required: true,
  })
  condition!: PrivilegeCondition

  @Prop({ type: GrantSupervisorSchema, default: null })
  supervisor!: GrantSupervisorEntity | null

  @Prop({ type: SchemaTypes.String, default: null })
  restriction_notes!: string | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'suspended', 'revoked', 'superseded'],
    required: true,
  })
  status!: PrivilegeGrantStatus

  @Prop({ type: SchemaTypes.Mixed, default: null })
  status_change!: StatusDecision | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  flag!: GrantFlag | null

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
 * Mongoose schema of the privilege grant.
 */
export const PrivilegeGrantSchema =
  SchemaFactory.createForClass(PrivilegeGrantEntity)

PrivilegeGrantSchema.index({ tenant_id: 1, employee_id: 1, status: 1 })
// The privilege directory.
PrivilegeGrantSchema.index({ tenant_id: 1, catalog_item_id: 1, status: 1 })
// Find the supervised grants when a supervisor loses theirs.
PrivilegeGrantSchema.index({ tenant_id: 1, 'supervisor.grant_id': 1 })
// One grant of a privilege per SPK.
PrivilegeGrantSchema.index(
  { tenant_id: 1, appointment_id: 1, catalog_item_id: 1 },
  { unique: true },
)
