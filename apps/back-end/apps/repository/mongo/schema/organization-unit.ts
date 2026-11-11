import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ExternalId } from '@repository/model/common/external-id'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'
import { ExternalIdSchema } from './common/external-id'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of an organization unit.
 */
export type OrganizationUnitDocument = HydratedDocument<OrganizationUnitEntity>

/**
 * Mongo storage shape of an `OrganizationUnit`, in the collection `organization_units`. Only the
 * Mongo repository uses it; the rest of the application uses the `OrganizationUnit` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property organization_id - Organization the unit belongs to.
 * @property facility_id - Facility the unit is in.
 * @property code - Unique code inside the facility.
 * @property name - Name per language.
 * @property type - Unit type.
 * @property parent_id - Parent unit, or `null` for a top unit.
 * @property ancestor_ids - All ancestors, top first.
 * @property is_clinical - Patients are treated here.
 * @property external_ids - Codes given by other systems.
 * @property period - When the unit exists, or `null`.
 * @property status - Whether the unit is in use.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'organization_units',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class OrganizationUnitEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  organization_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({ type: CodingSchema, required: true })
  type!: CodingEntity

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  parent_id!: Types.ObjectId | null

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  ancestor_ids!: Types.ObjectId[]

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_clinical!: boolean

  @Prop({ type: [ExternalIdSchema], default: [] })
  external_ids!: ExternalId[]

  @Prop({ type: DatePeriodSchema, default: null })
  period!: DatePeriodEntity | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'closed'],
    default: 'active',
  })
  status!: 'active' | 'closed'

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
 * Mongoose schema generated from `OrganizationUnitEntity`.
 */
export const OrganizationUnitSchema = SchemaFactory.createForClass(
  OrganizationUnitEntity,
)

OrganizationUnitSchema.index(
  { tenant_id: 1, facility_id: 1, code: 1 },
  { unique: true },
)
OrganizationUnitSchema.index({ tenant_id: 1, ancestor_ids: 1 })
OrganizationUnitSchema.index({
  tenant_id: 1,
  facility_id: 1,
  parent_id: 1,
  status: 1,
})
