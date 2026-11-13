import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Address } from '@repository/model/common/address'
import { type FileRef } from '@repository/model/common/file-ref'
import {
  type EligibilityRole,
  type LicenseStatus,
  type LicenseStatusReason,
  type LicenseSupersession,
  type LicenseVerification,
} from '@repository/model/professional-license'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a professional license.
 */
export type ProfessionalLicenseDocument =
  HydratedDocument<ProfessionalLicenseEntity>

/**
 * Mongo storage shape of the issuing authority.
 *
 * @property code - The authority as a code, or `null`.
 * @property name - Name as printed.
 */
@Schema({ _id: false })
export class IssuingAuthorityEntity {
  @Prop({ type: CodingSchema, default: null })
  code!: CodingEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  name!: string
}

/**
 * Mongoose schema of the embedded issuing authority.
 */
export const IssuingAuthoritySchema = SchemaFactory.createForClass(
  IssuingAuthorityEntity,
)

/**
 * Mongo storage shape of the jurisdiction.
 *
 * @property country - ISO 3166-1 alpha-2 code.
 * @property subdivision - ISO 3166-2 code, or `null`.
 */
@Schema({ _id: false })
export class LicenseJurisdictionEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  country!: string

  @Prop({ type: SchemaTypes.String, default: null })
  subdivision!: string | null
}

/**
 * Mongoose schema of the embedded jurisdiction.
 */
export const LicenseJurisdictionSchema = SchemaFactory.createForClass(
  LicenseJurisdictionEntity,
)

/**
 * Mongo storage shape of the practice location. `facility_id` is typed so the index on it works.
 *
 * @property facility_id - Facility of this tenant, or `null`.
 * @property name - Name as printed.
 * @property address - Address as printed, or `null`.
 */
@Schema({ _id: false })
export class PracticeLocationEntity {
  @Prop({ type: SchemaTypes.ObjectId, default: null })
  facility_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, required: true })
  name!: string

  @Prop({ type: SchemaTypes.Mixed, default: null })
  address!: Address | null
}

/**
 * Mongoose schema of the embedded practice location.
 */
export const PracticeLocationSchema = SchemaFactory.createForClass(
  PracticeLocationEntity,
)

/**
 * Mongo storage shape of how a licence was submitted.
 *
 * @property via - Self-service or entry by HR.
 * @property by - Who submitted it.
 * @property at - When.
 */
@Schema({ _id: false })
export class LicenseSubmissionEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['self_service', 'hr'],
    required: true,
  })
  via!: 'self_service' | 'hr'

  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date
}

/**
 * Mongoose schema of the embedded submission.
 */
export const LicenseSubmissionSchema = SchemaFactory.createForClass(
  LicenseSubmissionEntity,
)

/**
 * Mongo storage shape of a `ProfessionalLicense`, in the collection `professional_licenses`. Only
 * the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - Holder.
 * @property license_type - Licence type code.
 * @property eligibility_role - Copied from the type when registered, or `null`.
 * @property profession - Profession code.
 * @property specialty - Specialty code, or `null`.
 * @property document_number - As printed.
 * @property document_number_normalized - For uniqueness.
 * @property issuing_authority - Who issued it.
 * @property jurisdiction - Where it applies.
 * @property practice_location - Location, for location-specific types, or `null`.
 * @property issue_date - Issue date.
 * @property expiry_date - Expiry date, or `null`.
 * @property document - Scan reference.
 * @property status - Current status.
 * @property status_effective_date - Date the current status took effect.
 * @property is_live - False once rejected.
 * @property submission - How it was submitted.
 * @property verification - Verification result, or `null`.
 * @property rejection - Rejection reason, or `null`.
 * @property revocation - Revocation, or `null`.
 * @property superseded - Set when a renewal replaced it, or `null`.
 * @property replaces_license_id - Licence this one renews, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'professional_licenses',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class ProfessionalLicenseEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  license_type!: CodingEntity

  @Prop({
    type: SchemaTypes.String,
    enum: ['registration', 'practice_permit', null],
    default: null,
  })
  eligibility_role!: EligibilityRole | null

  @Prop({ type: CodingSchema, required: true })
  profession!: CodingEntity

  @Prop({ type: CodingSchema, default: null })
  specialty!: CodingEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  document_number!: string

  @Prop({ type: SchemaTypes.String, required: true })
  document_number_normalized!: string

  @Prop({ type: IssuingAuthoritySchema, required: true })
  issuing_authority!: IssuingAuthorityEntity

  @Prop({ type: LicenseJurisdictionSchema, required: true })
  jurisdiction!: LicenseJurisdictionEntity

  @Prop({ type: PracticeLocationSchema, default: null })
  practice_location!: PracticeLocationEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  issue_date!: string

  @Prop({ type: SchemaTypes.String, default: null })
  expiry_date!: string | null

  @Prop({ type: SchemaTypes.Mixed, required: true })
  document!: FileRef

  @Prop({
    type: SchemaTypes.String,
    enum: [
      'pending_verification',
      'valid',
      'rejected',
      'expired',
      'revoked',
      'superseded',
    ],
    required: true,
  })
  status!: LicenseStatus

  @Prop({ type: SchemaTypes.String, required: true })
  status_effective_date!: string

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_live!: boolean

  @Prop({ type: LicenseSubmissionSchema, required: true })
  submission!: LicenseSubmissionEntity

  @Prop({ type: SchemaTypes.Mixed, default: null })
  verification!: LicenseVerification | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  rejection!: LicenseStatusReason | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  revocation!: LicenseStatusReason | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  superseded!: LicenseSupersession | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  replaces_license_id!: Types.ObjectId | null

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
 * Mongoose schema generated from `ProfessionalLicenseEntity`.
 */
export const ProfessionalLicenseSchema = SchemaFactory.createForClass(
  ProfessionalLicenseEntity,
)

// One live record per document number and type; a rejected record does not block its correction.
ProfessionalLicenseSchema.index(
  {
    tenant_id: 1,
    'license_type.system': 1,
    'license_type.code': 1,
    document_number_normalized: 1,
  },
  { unique: true, partialFilterExpression: { is_live: true } },
)
// At most one valid practice permit per employee, profession and facility of this tenant
// (HR-LIC-006, decision C1). Used by verification (group 3.1, B2).
ProfessionalLicenseSchema.index(
  {
    tenant_id: 1,
    employee_id: 1,
    'profession.system': 1,
    'profession.code': 1,
    'practice_location.facility_id': 1,
  },
  {
    unique: true,
    name: 'unique_valid_practice_permit',
    partialFilterExpression: {
      status: 'valid',
      eligibility_role: 'practice_permit',
      'practice_location.facility_id': { $type: 'objectId' },
    },
  },
)
ProfessionalLicenseSchema.index({
  tenant_id: 1,
  employee_id: 1,
  eligibility_role: 1,
  status: 1,
})
ProfessionalLicenseSchema.index({ tenant_id: 1, status: 1, expiry_date: 1 })
ProfessionalLicenseSchema.index({
  tenant_id: 1,
  'practice_location.facility_id': 1,
  status: 1,
})
