import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of account credentials.
 */
export type AccountCredentialDocument =
  HydratedDocument<AccountCredentialEntity>

/**
 * Mongo storage shape of account credentials (secret class). Only the authentication service's
 * repository reads this collection. Pinned to `account_credentials`.
 */
@Schema({
  collection: 'account_credentials',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class AccountCredentialEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  account_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  password_hash!: string

  @Prop({ type: [SchemaTypes.String], default: [] })
  password_history!: string[]

  @Prop({ type: SchemaTypes.Date, required: true })
  password_changed_at!: Date

  @Prop({ type: SchemaTypes.Boolean, default: false })
  must_change!: boolean

  @Prop({ type: SchemaTypes.Number, default: 0 })
  failed_attempts!: number

  @Prop({ type: SchemaTypes.Date, default: null })
  last_failed_at!: Date | null

  @Prop({ type: SchemaTypes.Date, default: null })
  locked_until!: Date | null

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
 * Mongoose schema generated from `AccountCredentialEntity`.
 */
export const AccountCredentialSchema = SchemaFactory.createForClass(
  AccountCredentialEntity,
)

AccountCredentialSchema.index({ account_id: 1 }, { unique: true })
