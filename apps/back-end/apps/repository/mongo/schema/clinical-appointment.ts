import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import { type CredentialingScope } from '@repository/model/common/credentialing'
import { type StatusDecision } from '@repository/model/common/decision'
import { type ClinicalAppointmentStatus } from '@repository/model/clinical-appointment'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a clinical appointment.
 */
export type ClinicalAppointmentDocument =
  HydratedDocument<ClinicalAppointmentEntity>

/**
 * Mongo storage shape of who issued an SPK.
 *
 * @property by - Account that recorded the issue.
 * @property director_employee_id - Director or delegate.
 * @property date - Issue date, a local date.
 */
@Schema({ _id: false })
export class AppointmentIssueEntity {
  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  director_employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  date!: string
}

/**
 * Mongoose schema of the embedded issue details.
 */
export const AppointmentIssueSchema = SchemaFactory.createForClass(
  AppointmentIssueEntity,
)

/**
 * Mongo storage shape of a `ClinicalAppointment`, in the collection `clinical_appointments`.
 * Only the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property appointment_number - SPK letter number.
 * @property employee_id - Practitioner.
 * @property credentialing_facility_id - Facility whose Director issued it.
 * @property credentialing_scope - Scope it was issued under.
 * @property facility_ids - Facilities of the covered units.
 * @property unit_ids - Units covered.
 * @property source_application_id - Application it came from.
 * @property valid_period - First and last valid day.
 * @property is_temporary - Whether it is a temporary SPK.
 * @property status - Current status.
 * @property is_current - True while active or suspended.
 * @property issued - Issue details.
 * @property signed_document - Scan of the signed letter, or `null`.
 * @property suspension - Suspension decision, or `null`.
 * @property revocation - Revocation decision, or `null`.
 * @property superseded_by_id - SPK that replaced it, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'clinical_appointments',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class ClinicalAppointmentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  appointment_number!: string

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

  @Prop({ type: [SchemaTypes.ObjectId], required: true })
  facility_ids!: Types.ObjectId[]

  @Prop({ type: [SchemaTypes.ObjectId], required: true })
  unit_ids!: Types.ObjectId[]

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  source_application_id!: Types.ObjectId

  @Prop({ type: DatePeriodSchema, required: true })
  valid_period!: DatePeriodEntity

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_temporary!: boolean

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'suspended', 'revoked', 'expired', 'superseded'],
    required: true,
  })
  status!: ClinicalAppointmentStatus

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_current!: boolean

  @Prop({ type: AppointmentIssueSchema, required: true })
  issued!: AppointmentIssueEntity

  @Prop({ type: SchemaTypes.Mixed, default: null })
  signed_document!: FileRef | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  suspension!: StatusDecision | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  revocation!: StatusDecision | null

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  superseded_by_id!: Types.ObjectId | null

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
 * Mongoose schema of the clinical appointment.
 */
export const ClinicalAppointmentSchema = SchemaFactory.createForClass(
  ClinicalAppointmentEntity,
)

// One SPK letter number per tenant.
ClinicalAppointmentSchema.index(
  { tenant_id: 1, appointment_number: 1 },
  { unique: true },
)
// One current regular SPK per employee and credentialing facility (HR plan 4.3 SP7).
ClinicalAppointmentSchema.index(
  { tenant_id: 1, employee_id: 1, credentialing_facility_id: 1, is_temporary: 1 },
  {
    unique: true,
    partialFilterExpression: { is_current: true, is_temporary: false },
  },
)
// Eligibility in a unit, and of an employee.
ClinicalAppointmentSchema.index({ tenant_id: 1, unit_ids: 1, status: 1 })
ClinicalAppointmentSchema.index({ tenant_id: 1, employee_id: 1, status: 1 })
// The expiry job and the expiring-soon list.
ClinicalAppointmentSchema.index({
  tenant_id: 1,
  status: 1,
  'valid_period.end': 1,
})
