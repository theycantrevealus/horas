import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ExternalId } from '@repository/model/common/external-id'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { ExternalIdSchema } from './common/external-id'

/**
 * Hydrated Mongoose document of an organization.
 */
export type OrganizationDocument = HydratedDocument<OrganizationEntity>

/**
 * Mongo storage shape of an `Organization`, in the collection `organizations`. Only the Mongo
 * repository uses it; the rest of the application uses the `Organization` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property code - Unique code inside the tenant.
 * @property legal_name - Registered name.
 * @property country - ISO 3166-1 alpha-2 code.
 * @property identifiers - Company registration and tax numbers.
 * @property currency - ISO 4217 code.
 * @property status - Whether the organization is in use.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'organizations',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class OrganizationEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: SchemaTypes.String, required: true })
  legal_name!: string

  @Prop({ type: SchemaTypes.String, required: true })
  country!: string

  @Prop({ type: [ExternalIdSchema], default: [] })
  identifiers!: ExternalId[]

  @Prop({ type: SchemaTypes.String, required: true })
  currency!: string

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
 * Mongoose schema generated from `OrganizationEntity`.
 */
export const OrganizationSchema =
  SchemaFactory.createForClass(OrganizationEntity)

OrganizationSchema.index({ tenant_id: 1, code: 1 }, { unique: true })
