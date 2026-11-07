import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import {
  type AccountClosure,
  type AccountHold,
  type AccountPreferences,
  type AccountProfile,
  type AccountStatus,
  type AccountType,
  type AccountValidity,
  type LoginIdentifier,
} from '@repository/model/account'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'
import { Schema as MongooseSchema } from 'mongoose'

/**
 * Hydrated Mongoose document of an account.
 */
export type AccountDocument = HydratedDocument<AccountEntity>

/**
 * Embedded schema of a login identifier.
 */
const LoginIdentifierSchema = new MongooseSchema(
  {
    type: {
      type: String,
      enum: ['username', 'email', 'phone'],
      required: true,
    },
    value: { type: String, required: true },
    normalized: { type: String, required: true },
    is_primary: { type: Boolean, default: false },
    verified_at: { type: Date, default: null },
  },
  { _id: false },
)

/**
 * Embedded schema of an account hold.
 */
const AccountHoldSchema = new MongooseSchema(
  {
    kind: { type: String, enum: ['suspend', 'disable'], required: true },
    reason: {
      type: String,
      enum: [
        'employment_suspended',
        'employment_ended',
        'contract_expired',
        'sponsor_ended',
        'external_expired',
        'inactivity',
        'security',
        'administrative',
      ],
      required: true,
    },
    source: {
      type: String,
      enum: ['workforce', 'identity', 'security'],
      required: true,
    },
    source_ref: { type: String, default: null },
    placed_by: { type: ActorRefSchema, required: true },
    placed_at: { type: Date, required: true },
    notes: { type: String },
  },
  { _id: false },
)

/**
 * Mongo storage shape of an account. Only the Mongo repository uses it; the rest of the
 * application uses the `Account` model. Holds no secrets (`account_credentials` does).
 * The collection is pinned to `accounts`. `version` is the Mongoose version key, so optimistic
 * concurrency is on (`database.md` 4.5).
 */
@Schema({
  collection: 'accounts',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class AccountEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['workforce', 'external', 'service'],
    required: true,
  })
  account_type!: AccountType

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  employee_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  sponsor_account_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, required: true })
  username!: string

  @Prop({ type: [LoginIdentifierSchema], default: [] })
  login_identifiers!: LoginIdentifier[]

  @Prop({
    type: new MongooseSchema(
      {
        display_name: { type: String, required: true },
        given_name: { type: String },
        family_name: { type: String },
        avatar: {
          type: new MongooseSchema(
            {
              file_id: String,
              content_type: String,
              sha256: String,
            },
            { _id: false },
          ),
        },
      },
      { _id: false },
    ),
    required: true,
  })
  profile!: AccountProfile

  @Prop({ type: SchemaTypes.String, enum: ['hr', 'local'], required: true })
  profile_source!: 'hr' | 'local'

  @Prop({
    type: new MongooseSchema(
      {
        locale: { type: String, required: true },
        timezone: { type: String, default: null },
        default_facility_id: { type: String, default: null },
      },
      { _id: false },
    ),
    required: true,
  })
  preferences!: AccountPreferences

  @Prop({
    type: SchemaTypes.String,
    enum: [
      'pending_activation',
      'active',
      'locked',
      'suspended',
      'disabled',
      'closed',
    ],
    required: true,
  })
  status!: AccountStatus

  @Prop({ type: SchemaTypes.Date, required: true })
  status_changed_at!: Date

  @Prop({ type: SchemaTypes.Boolean, default: true })
  is_open!: boolean

  @Prop({ type: [AccountHoldSchema], default: [] })
  holds!: AccountHold[]

  @Prop({
    type: new MongooseSchema(
      {
        not_before: { type: Date, default: null },
        expires_at: { type: Date, default: null },
      },
      { _id: false },
    ),
    default: () => ({ not_before: null, expires_at: null }),
  })
  validity!: AccountValidity

  @Prop({ type: SchemaTypes.Boolean, default: false })
  mfa_required!: boolean

  @Prop({ type: SchemaTypes.Number, default: 1 })
  authz_version!: number

  @Prop({ type: SchemaTypes.Date, default: null })
  last_login_at!: Date | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  request_id!: Types.ObjectId | null

  @Prop({
    type: new MongooseSchema(
      {
        at: { type: Date, required: true },
        reason: { type: CodingSchema, required: true },
        pseudonymized_at: { type: Date, default: null },
      },
      { _id: false },
    ),
    default: null,
  })
  closed!: AccountClosure | null

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
 * Mongoose schema generated from `AccountEntity`, with the indexes of design section 11.
 */
export const AccountSchema = SchemaFactory.createForClass(AccountEntity)

// One open account per employee. Partial filters do not support `$ne`, hence `is_open`.
AccountSchema.index(
  { tenant_id: 1, employee_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      employee_id: { $type: 'objectId' },
      is_open: true,
    },
  },
)
// Login lookup; also makes every login identifier unique inside a tenant.
AccountSchema.index(
  {
    tenant_id: 1,
    'login_identifiers.type': 1,
    'login_identifiers.normalized': 1,
  },
  { unique: true },
)
// Expiry job.
AccountSchema.index({ tenant_id: 1, status: 1, 'validity.expires_at': 1 })
