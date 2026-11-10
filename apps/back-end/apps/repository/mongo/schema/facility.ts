import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ExternalId } from '@repository/model/common/external-id'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { AddressEntity, AddressSchema } from './common/address'
import { ExternalIdSchema } from './common/external-id'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a facility.
 */
export type FacilityDocument = HydratedDocument<FacilityEntity>

/**
 * Mongo storage shape of a `Facility`, in the collection `facilities`. Only the Mongo
 * repository uses it; the rest of the application uses the `Facility` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property organization_id - Organization that runs the facility.
 * @property code - Unique code inside the tenant.
 * @property name - Name per language.
 * @property address - Site address, or `null`.
 * @property timezone - IANA time zone the facility's local dates and times are read in.
 * @property holiday_calendar_codes - Holiday calendars that apply.
 * @property external_ids - Codes given by regulators.
 * @property status - Whether the facility is in use.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'facilities',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class FacilityEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  organization_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({ type: AddressSchema, default: null })
  address!: AddressEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  timezone!: string

  @Prop({ type: [SchemaTypes.String], default: [] })
  holiday_calendar_codes!: string[]

  @Prop({ type: [ExternalIdSchema], default: [] })
  external_ids!: ExternalId[]

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
 * Mongoose schema generated from `FacilityEntity`.
 */
export const FacilitySchema = SchemaFactory.createForClass(FacilityEntity)

FacilitySchema.index({ tenant_id: 1, code: 1 }, { unique: true })
FacilitySchema.index({ tenant_id: 1, organization_id: 1, status: 1 })
