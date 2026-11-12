import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of an HR parameter value.
 */
export type HrParameterDocument = HydratedDocument<HrParameterEntity>

/**
 * Mongo storage shape of a parameter scope.
 *
 * @property kind - Tenant, organization, facility, unit or committee.
 * @property id - Identifier at that level, or `null` for the tenant.
 */
@Schema({ _id: false })
export class HrParameterScopeEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['tenant', 'organization', 'facility', 'unit', 'committee'],
    required: true,
  })
  kind!: 'tenant' | 'organization' | 'facility' | 'unit' | 'committee'

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  id!: Types.ObjectId | null
}

/**
 * Mongoose schema of an embedded parameter scope.
 */
export const HrParameterScopeSchema = SchemaFactory.createForClass(
  HrParameterScopeEntity,
)

/**
 * Mongo storage shape of an `HrParameter`, in the collection `hr_parameters`. Only the Mongo
 * repository uses it; the rest of the application uses the `HrParameter` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property key - Parameter key from the catalog in code.
 * @property scope - Level the value applies to.
 * @property value - Value; its shape is checked by the service, not by the database.
 * @property effective_from - First day the value applies.
 * @property notes - Legal basis, or `null`.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'hr_parameters',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class HrParameterEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  key!: string

  @Prop({ type: HrParameterScopeSchema, required: true })
  scope!: HrParameterScopeEntity

  @Prop({ type: SchemaTypes.Mixed, required: true })
  value!: unknown

  @Prop({ type: SchemaTypes.String, required: true })
  effective_from!: string

  @Prop({ type: SchemaTypes.String, default: null })
  notes!: string | null

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
 * Mongoose schema generated from `HrParameterEntity`.
 */
export const HrParameterSchema = SchemaFactory.createForClass(HrParameterEntity)

HrParameterSchema.index(
  {
    tenant_id: 1,
    key: 1,
    'scope.kind': 1,
    'scope.id': 1,
    effective_from: 1,
  },
  { unique: true },
)
HrParameterSchema.index({ tenant_id: 1, key: 1 })
