import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type PrivilegeCondition } from '@repository/model/common/credentialing'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'

/**
 * Hydrated Mongoose document of a credential assessment.
 */
export type CredentialAssessmentDocument =
  HydratedDocument<CredentialAssessmentEntity>

/**
 * Mongo storage shape of a `CredentialAssessment`, in the collection `credential_assessments`.
 * Only the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property application_id - The application.
 * @property employee_id - The applicant.
 * @property assessor_employee_id - The assessor.
 * @property catalog_item_id - The privilege assessed.
 * @property methods - How it was assessed.
 * @property outcome - Recommended or not.
 * @property recommended_condition - Condition recommended, or `null`.
 * @property reason - Assessor's reasoning.
 * @property assessed_at - When assessed.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'credential_assessments',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CredentialAssessmentEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  application_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  assessor_employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  catalog_item_id!: Types.ObjectId

  @Prop({ type: [CodingSchema], required: true })
  methods!: CodingEntity[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['recommended', 'not_recommended'],
    required: true,
  })
  outcome!: 'recommended' | 'not_recommended'

  @Prop({
    type: SchemaTypes.String,
    enum: ['full', 'supervised', 'restricted'],
    default: null,
  })
  recommended_condition!: PrivilegeCondition | null

  @Prop({ type: SchemaTypes.String, required: true })
  reason!: string

  @Prop({ type: SchemaTypes.Date, required: true })
  assessed_at!: Date

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
 * Mongoose schema of the credential assessment.
 */
export const CredentialAssessmentSchema = SchemaFactory.createForClass(
  CredentialAssessmentEntity,
)

// One assessment per assessor and privilege of an application (HR plan 4.2 AP11).
CredentialAssessmentSchema.index(
  {
    tenant_id: 1,
    application_id: 1,
    assessor_employee_id: 1,
    catalog_item_id: 1,
  },
  { unique: true },
)
