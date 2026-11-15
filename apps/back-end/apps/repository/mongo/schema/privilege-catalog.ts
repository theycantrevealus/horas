import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a privilege catalog item.
 */
export type PrivilegeCatalogDocument =
  HydratedDocument<PrivilegeCatalogEntity>

/**
 * Mongo storage shape of one piece of required evidence.
 *
 * @property type - Kind of evidence code.
 * @property description - What is expected, per language.
 * @property mandatory - Whether the application cannot be submitted without it.
 */
@Schema({ _id: false })
export class RequiredEvidenceEntity {
  @Prop({ type: CodingSchema, required: true })
  type!: CodingEntity

  @Prop({ type: [LocalizedTextSchema], default: [] })
  description!: LocalizedText[]

  @Prop({ type: SchemaTypes.Boolean, required: true })
  mandatory!: boolean
}

/**
 * Mongoose schema of the embedded required evidence.
 */
export const RequiredEvidenceSchema = SchemaFactory.createForClass(
  RequiredEvidenceEntity,
)

/**
 * Mongo storage shape of a `PrivilegeCatalogItem`, in the collection `privilege_catalog_items`.
 * Only the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property facility_ids - Facilities that may grant it; empty means all.
 * @property code - Unique in the tenant.
 * @property name - Name per language.
 * @property description - Description per language.
 * @property committee - Owning committee code.
 * @property professions - Professions that may request it.
 * @property specialties - Specialties that may request it; empty means any.
 * @property min_clinical_level - Required career level, or `null`.
 * @property required_evidence - Evidence to attach.
 * @property external_codes - Matching procedure codes.
 * @property status - `active` or `retired`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'privilege_catalog_items',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class PrivilegeCatalogEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  facility_ids!: Types.ObjectId[]

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({ type: [LocalizedTextSchema], default: [] })
  description!: LocalizedText[]

  @Prop({ type: CodingSchema, required: true })
  committee!: CodingEntity

  @Prop({ type: [CodingSchema], default: [] })
  professions!: CodingEntity[]

  @Prop({ type: [CodingSchema], default: [] })
  specialties!: CodingEntity[]

  @Prop({ type: CodingSchema, default: null })
  min_clinical_level!: CodingEntity | null

  @Prop({ type: [RequiredEvidenceSchema], default: [] })
  required_evidence!: RequiredEvidenceEntity[]

  @Prop({ type: [CodingSchema], default: [] })
  external_codes!: CodingEntity[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'retired'],
    default: 'active',
  })
  status!: 'active' | 'retired'

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
 * Mongoose schema generated from `PrivilegeCatalogEntity`.
 */
export const PrivilegeCatalogSchema = SchemaFactory.createForClass(
  PrivilegeCatalogEntity,
)

PrivilegeCatalogSchema.index({ tenant_id: 1, code: 1 }, { unique: true })
PrivilegeCatalogSchema.index({
  tenant_id: 1,
  'committee.code': 1,
  status: 1,
})
PrivilegeCatalogSchema.index({
  tenant_id: 1,
  'professions.code': 1,
  status: 1,
})
