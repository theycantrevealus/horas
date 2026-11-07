import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import {
  HydratedDocument,
  Schema as MongooseSchema,
  SchemaTypes,
  Types,
} from 'mongoose'
import {
  type SessionAuthentication,
  type SessionClient,
} from '@repository/model/account-session'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of an account session.
 */
export type AccountSessionDocument = HydratedDocument<AccountSessionEntity>

/**
 * Mongo storage shape of a refresh-token session (secret class). Pinned to `account_sessions`.
 * Not business data, so writes are not in the change history. A TTL index removes expired sessions.
 */
@Schema({
  collection: 'account_sessions',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class AccountSessionEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  account_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  refresh_token_hash!: string

  @Prop({ type: SchemaTypes.String, required: true })
  family_id!: string

  @Prop({
    type: new MongooseSchema(
      {
        app: { type: String, required: true },
        device_label: { type: String },
        user_agent_hash: { type: String, required: true },
      },
      { _id: false },
    ),
    required: true,
  })
  client!: SessionClient

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  facility_id!: Types.ObjectId | null

  @Prop({
    type: new MongooseSchema(
      {
        method: {
          type: String,
          enum: ['password', 'sso', 'webauthn'],
          required: true,
        },
        mfa: { type: Boolean, required: true },
        at: { type: Date, required: true },
      },
      { _id: false },
    ),
    required: true,
  })
  authenticated_with!: SessionAuthentication

  @Prop({ type: SchemaTypes.Date, required: true })
  last_seen_at!: Date

  @Prop({ type: SchemaTypes.Date, required: true })
  expires_at!: Date

  @Prop({ type: SchemaTypes.Date, default: null })
  revoked_at!: Date | null

  @Prop({ type: SchemaTypes.String, default: null })
  revoke_reason!: string | null

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
 * Mongoose schema generated from `AccountSessionEntity`.
 */
export const AccountSessionSchema =
  SchemaFactory.createForClass(AccountSessionEntity)

AccountSessionSchema.index({ refresh_token_hash: 1 }, { unique: true })
AccountSessionSchema.index({ account_id: 1, revoked_at: 1 })
AccountSessionSchema.index({ family_id: 1 })
AccountSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })
