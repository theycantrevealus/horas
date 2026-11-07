import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ScopeKind } from '@repository/model/role'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a role.
 */
export type RoleDocument = HydratedDocument<RoleEntity>

/**
 * Mongo storage shape of a role. Pinned to `roles`.
 */
@Schema({
  collection: 'roles',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class RoleEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({ type: [LocalizedTextSchema], default: [] })
  description!: LocalizedText[]

  @Prop({ type: [SchemaTypes.String], default: [] })
  permissions!: string[]

  @Prop({ type: [SchemaTypes.String], default: [] })
  allowed_scopes!: ScopeKind[]

  @Prop({ type: [SchemaTypes.String], default: [] })
  assignable_by!: string[]

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_system!: boolean

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status!: 'active' | 'inactive'

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
 * Mongoose schema generated from `RoleEntity`.
 */
export const RoleSchema = SchemaFactory.createForClass(RoleEntity)

RoleSchema.index({ tenant_id: 1, code: 1 }, { unique: true })
