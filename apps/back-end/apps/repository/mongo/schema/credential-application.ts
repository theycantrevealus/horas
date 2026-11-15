import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import {
  type CommitteeRecommendation,
  type ConflictDeclaration,
  type DirectorDecision,
  type CredentialApplicationStatus,
  type CredentialApplicationType,
} from '@repository/model/credential-application'
import {
  type CredentialingScope,
  type PrivilegeCondition,
} from '@repository/model/common/credentialing'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a credential application.
 */
export type CredentialApplicationDocument =
  HydratedDocument<CredentialApplicationEntity>

/**
 * Mongo storage shape of one requested privilege.
 *
 * @property catalog_item_id - The catalog item.
 * @property code - Snapshot of the catalog code.
 * @property requested_condition - Condition asked for.
 * @property proposed_supervisor_employee_id - Proposed supervisor, or `null`.
 * @property notes - Notes, or `null`.
 */
@Schema({ _id: false })
export class RequestedPrivilegeEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  catalog_item_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['full', 'supervised', 'restricted'],
    required: true,
  })
  requested_condition!: PrivilegeCondition

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  proposed_supervisor_employee_id!: Types.ObjectId | null

  @Prop({ type: SchemaTypes.String, default: null })
  notes!: string | null
}

/**
 * Mongoose schema of the embedded requested privilege.
 */
export const RequestedPrivilegeSchema = SchemaFactory.createForClass(
  RequestedPrivilegeEntity,
)

/**
 * Mongo storage shape of one attached document.
 *
 * @property type - Document type code.
 * @property file - Reference to the file.
 * @property license_id - Licence the document belongs to, or `null`.
 */
@Schema({ _id: false })
export class ApplicationDocumentEntity {
  @Prop({ type: CodingSchema, required: true })
  type!: CodingEntity

  @Prop({ type: SchemaTypes.Mixed, required: true })
  file!: FileRef

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  license_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of the embedded document.
 */
export const ApplicationDocumentSchema = SchemaFactory.createForClass(
  ApplicationDocumentEntity,
)

/**
 * Mongo storage shape of one appointed assessor.
 *
 * @property employee_id - The assessor.
 * @property appointed_at - When.
 * @property appointed_by - Who appointed.
 * @property conflict_declaration - The declaration, or `null`.
 */
@Schema({ _id: false })
export class ApplicationAssessorEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Date, required: true })
  appointed_at!: Date

  @Prop({ type: ActorRefSchema, required: true })
  appointed_by!: ActorRef

  @Prop({ type: SchemaTypes.Mixed, default: null })
  conflict_declaration!: ConflictDeclaration | null
}

/**
 * Mongoose schema of the embedded assessor.
 */
export const ApplicationAssessorSchema = SchemaFactory.createForClass(
  ApplicationAssessorEntity,
)

/**
 * Mongo storage shape of a `CredentialApplication`, in the collection `credential_applications`.
 * Only the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The applicant.
 * @property credentialing_facility_id - Facility whose committee credentials the applicant.
 * @property credentialing_scope - Scope copied when the application was created.
 * @property type - Application type.
 * @property committee - Committee code.
 * @property status - Process status.
 * @property status_since - When the current status began.
 * @property requested_privileges - What is asked for.
 * @property requested_unit_ids - Units the privileges are asked for.
 * @property requested_facility_ids - Facilities of those units.
 * @property documents - Attached documents.
 * @property assessors - Appointed assessors.
 * @property recommendation - The committee's recommendation, or `null`.
 * @property decision - The Director's decision, or `null`.
 * @property return_reason - Reason of the last return, or `null`.
 * @property withdrawal_reason - Reason of the withdrawal, or `null`.
 * @property temporary - Temporary request, or `null`.
 * @property previous_appointment_id - SPK being renewed, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'credential_applications',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CredentialApplicationEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  credentialing_facility_id!: Types.ObjectId

  @Prop({
    type: SchemaTypes.String,
    enum: ['facility', 'group'],
    required: true,
  })
  credentialing_scope!: CredentialingScope

  @Prop({
    type: SchemaTypes.String,
    enum: ['initial', 'recredentialing', 'privilege_extension', 'temporary'],
    required: true,
  })
  type!: CredentialApplicationType

  @Prop({ type: CodingSchema, required: true })
  committee!: CodingEntity

  @Prop({
    type: SchemaTypes.String,
    enum: [
      'draft',
      'submitted',
      'under_review',
      'returned',
      'assessed',
      'recommended',
      'approved',
      'rejected',
      'withdrawn',
    ],
    required: true,
  })
  status!: CredentialApplicationStatus

  @Prop({ type: SchemaTypes.Date, required: true })
  status_since!: Date

  @Prop({ type: [RequestedPrivilegeSchema], default: [] })
  requested_privileges!: RequestedPrivilegeEntity[]

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  requested_unit_ids!: Types.ObjectId[]

  @Prop({ type: [SchemaTypes.ObjectId], default: [] })
  requested_facility_ids!: Types.ObjectId[]

  @Prop({ type: [ApplicationDocumentSchema], default: [] })
  documents!: ApplicationDocumentEntity[]

  @Prop({ type: [ApplicationAssessorSchema], default: [] })
  assessors!: ApplicationAssessorEntity[]

  @Prop({ type: SchemaTypes.Mixed, default: null })
  recommendation!: CommitteeRecommendation | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  decision!: DirectorDecision | null

  @Prop({ type: SchemaTypes.String, default: null })
  return_reason!: string | null

  @Prop({ type: SchemaTypes.String, default: null })
  withdrawal_reason!: string | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  temporary!: { requested_days: number; urgency: CodingEntity } | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  previous_appointment_id!: Types.ObjectId | null

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
 * Mongoose schema generated from `CredentialApplicationEntity`.
 */
export const CredentialApplicationSchema = SchemaFactory.createForClass(
  CredentialApplicationEntity,
)

CredentialApplicationSchema.index({
  tenant_id: 1,
  employee_id: 1,
  status: 1,
})
// The committee work queue and the service-level alerts: oldest status first.
CredentialApplicationSchema.index({
  tenant_id: 1,
  'committee.code': 1,
  status: 1,
  status_since: 1,
})
// The open renewal of an SPK (HR plan 4.4 RN2).
CredentialApplicationSchema.index({ tenant_id: 1, previous_appointment_id: 1 })
