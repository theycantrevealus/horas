import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type ExternalId } from '@repository/model/common/external-id'
import { type FileRef } from '@repository/model/common/file-ref'
import { type EmploymentStatus } from '@repository/model/employee'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { ContactPointEntity, ContactPointSchema } from './common/contact-point'
import { ExternalIdSchema } from './common/external-id'
import { HumanNameEntity, HumanNameSchema } from './common/human-name'

/**
 * Hydrated Mongoose document of an employee.
 */
export type EmployeeDocument = HydratedDocument<EmployeeEntity>

/**
 * Mongo storage shape of one specialty of an employee.
 *
 * @property coding - The specialty.
 * @property is_primary - Main specialty.
 */
@Schema({ _id: false })
export class EmployeeSpecialtyEntity {
  @Prop({ type: CodingSchema, required: true })
  coding!: CodingEntity

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_primary!: boolean
}

/**
 * Mongoose schema of an embedded specialty.
 */
export const EmployeeSpecialtySchema = SchemaFactory.createForClass(
  EmployeeSpecialtyEntity,
)

/**
 * Mongo storage shape of the active contract summary.
 *
 * @property contract_id - Active contract.
 * @property organization_id - Employer.
 * @property employment_type - Contract type.
 * @property start_date - First day of the contract.
 */
@Schema({ _id: false })
export class CurrentEmploymentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  contract_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  organization_id!: Types.ObjectId

  @Prop({ type: CodingSchema, required: true })
  employment_type!: CodingEntity

  @Prop({ type: SchemaTypes.String, required: true })
  start_date!: string
}

/**
 * Mongoose schema of the embedded contract summary.
 */
export const CurrentEmploymentSchema = SchemaFactory.createForClass(
  CurrentEmploymentEntity,
)

/**
 * Mongo storage shape of the primary assignment summary.
 *
 * @property assignment_id - The assignment.
 * @property facility_id - Facility of the position.
 * @property unit_id - Unit of the position.
 * @property position_id - The position.
 */
@Schema({ _id: false })
export class PrimaryAssignmentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  assignment_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  facility_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  position_id!: Types.ObjectId
}

/**
 * Mongoose schema of the embedded assignment summary.
 */
export const PrimaryAssignmentSchema = SchemaFactory.createForClass(
  PrimaryAssignmentEntity,
)

/**
 * Mongo storage shape of an `Employee`, in the collection `employees`. Only the Mongo repository
 * uses it; the rest of the application uses the `Employee` model. It holds public and internal
 * fields only: confidential data is in `employee_private_profiles`.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_number - Hospital-issued number, unique in the tenant, never reused.
 * @property name - Official name.
 * @property other_names - Usual and native-script names.
 * @property display_name - Name to show.
 * @property administrative_gender - FHIR administrative gender, or `null`.
 * @property workforce_category - Workforce category code.
 * @property is_clinical - Clinical rules apply.
 * @property profession - Profession, or `null`.
 * @property specialties - Specialties.
 * @property clinical_level - Career level, or `null`.
 * @property employment_status - Current status.
 * @property employment_status_since - Local date the status took effect.
 * @property current_employment - Active contract summary, or `null`.
 * @property primary_assignment - Primary assignment summary, or `null`.
 * @property original_hire_date - First hire date.
 * @property separation_date - Last day of employment, or `null`.
 * @property practitioner_ids - Public registry numbers.
 * @property work_contacts - Work email and phone.
 * @property photo - Staff photo, or `null`.
 * @property preferred_language - BCP 47 tag, or `null`.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'employees',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class EmployeeEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  employee_number!: string

  @Prop({ type: HumanNameSchema, required: true })
  name!: HumanNameEntity

  @Prop({ type: [HumanNameSchema], default: [] })
  other_names!: HumanNameEntity[]

  @Prop({ type: SchemaTypes.String, required: true })
  display_name!: string

  @Prop({ type: CodingSchema, default: null })
  administrative_gender!: CodingEntity | null

  @Prop({ type: CodingSchema, required: true })
  workforce_category!: CodingEntity

  @Prop({ type: SchemaTypes.Boolean, required: true })
  is_clinical!: boolean

  @Prop({ type: CodingSchema, default: null })
  profession!: CodingEntity | null

  @Prop({ type: [EmployeeSpecialtySchema], default: [] })
  specialties!: EmployeeSpecialtyEntity[]

  @Prop({ type: CodingSchema, default: null })
  clinical_level!: CodingEntity | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['onboarding', 'probation', 'active', 'suspended', 'separated'],
    default: 'onboarding',
  })
  employment_status!: EmploymentStatus

  @Prop({ type: SchemaTypes.String, required: true })
  employment_status_since!: string

  @Prop({ type: CurrentEmploymentSchema, default: null })
  current_employment!: CurrentEmploymentEntity | null

  @Prop({ type: PrimaryAssignmentSchema, default: null })
  primary_assignment!: PrimaryAssignmentEntity | null

  @Prop({ type: SchemaTypes.String, required: true })
  original_hire_date!: string

  @Prop({ type: SchemaTypes.String, default: null })
  separation_date!: string | null

  @Prop({ type: [ExternalIdSchema], default: [] })
  practitioner_ids!: ExternalId[]

  @Prop({ type: [ContactPointSchema], default: [] })
  work_contacts!: ContactPointEntity[]

  @Prop({ type: SchemaTypes.Mixed, default: null })
  photo!: FileRef | null

  @Prop({ type: SchemaTypes.String, default: null })
  preferred_language!: string | null

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
 * Mongoose schema generated from `EmployeeEntity`.
 */
export const EmployeeSchema = SchemaFactory.createForClass(EmployeeEntity)

// Includes soft-deleted documents on purpose, so a number is never reused.
EmployeeSchema.index({ tenant_id: 1, employee_number: 1 }, { unique: true })
EmployeeSchema.index({ tenant_id: 1, employment_status: 1, is_clinical: 1 })
EmployeeSchema.index({
  tenant_id: 1,
  'primary_assignment.unit_id': 1,
  employment_status: 1,
})
// A public registry number belongs to one employee. Partial, so employees without one are not
// indexed as equal.
EmployeeSchema.index(
  {
    tenant_id: 1,
    'practitioner_ids.system': 1,
    'practitioner_ids.value': 1,
  },
  {
    unique: true,
    partialFilterExpression: { 'practitioner_ids.system': { $exists: true } },
  },
)
