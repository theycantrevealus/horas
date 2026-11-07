import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import {
  HydratedDocument,
  Schema as MongooseSchema,
  SchemaTypes,
  Types,
} from 'mongoose'
import {
  type BindingPeriod,
  type BindingScope,
} from '@repository/model/account-role-binding'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a role binding.
 */
export type AccountRoleBindingDocument =
  HydratedDocument<AccountRoleBindingEntity>

/**
 * Mongo storage shape of a role binding. Pinned to `account_role_bindings`.
 */
@Schema({
  collection: 'account_role_bindings',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class AccountRoleBindingEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  account_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  role_id!: Types.ObjectId

  @Prop({
    type: new MongooseSchema(
      {
        kind: {
          type: String,
          enum: ['tenant', 'organization', 'facility', 'unit'],
          required: true,
        },
        organization_id: { type: String },
        facility_id: { type: String },
        unit_id: { type: String },
        include_descendants: { type: Boolean, default: false },
      },
      { _id: false },
    ),
    required: true,
  })
  scope!: BindingScope

  @Prop({
    type: SchemaTypes.String,
    enum: ['manual', 'derived'],
    required: true,
  })
  source!: 'manual' | 'derived'

  @Prop({
    type: new MongooseSchema(
      {
        type: {
          type: String,
          enum: ['position_assignment', 'committee_membership'],
          required: true,
        },
        id: { type: String, required: true },
        rule_id: { type: String, required: true },
      },
      { _id: false },
    ),
    default: null,
  })
  source_ref!: {
    type: 'position_assignment' | 'committee_membership'
    id: string
    rule_id: string
  } | null

  @Prop({
    type: new MongooseSchema(
      {
        start: { type: Date, required: true },
        end: { type: Date, default: null },
      },
      { _id: false },
    ),
    required: true,
  })
  period!: BindingPeriod

  @Prop({ type: ActorRefSchema, required: true })
  granted_by!: ActorRef

  @Prop({ type: ActorRefSchema, default: null })
  approved_by!: ActorRef | null

  @Prop({ type: SchemaTypes.String, default: null })
  reason!: string | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'ended', 'revoked'],
    default: 'active',
  })
  status!: 'active' | 'ended' | 'revoked'

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
 * Mongoose schema generated from `AccountRoleBindingEntity`.
 */
export const AccountRoleBindingSchema = SchemaFactory.createForClass(
  AccountRoleBindingEntity,
)

AccountRoleBindingSchema.index({ tenant_id: 1, account_id: 1, status: 1 })
AccountRoleBindingSchema.index({ tenant_id: 1, 'source_ref.id': 1 })
