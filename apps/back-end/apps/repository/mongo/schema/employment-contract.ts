import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type FileRef } from '@repository/model/common/file-ref'
import { type ContractStatus } from '@repository/model/employment-contract'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingEntity, CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of an employment contract.
 */
export type EmploymentContractDocument =
  HydratedDocument<EmploymentContractEntity>

/**
 * Mongo storage shape of the early end of a contract.
 *
 * @property date - Last day of the contract.
 * @property reason - Termination reason code.
 * @property notes - Free text, or `null`.
 */
@Schema({ _id: false })
export class ContractTerminationEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: CodingSchema, required: true })
  reason!: CodingEntity

  @Prop({ type: SchemaTypes.String, default: null })
  notes!: string | null
}

/**
 * Mongoose schema of the embedded termination.
 */
export const ContractTerminationSchema = SchemaFactory.createForClass(
  ContractTerminationEntity,
)

/**
 * Mongo storage shape of an `EmploymentContract`, in the collection `employment_contracts`. Only
 * the Mongo repository uses it; the rest of the application uses the `EmploymentContract` model.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property employee_id - The employee.
 * @property organization_id - Employer.
 * @property contract_number - Unique per employer.
 * @property employment_type - Employment type code.
 * @property period - Contract dates.
 * @property probation_end_date - Last day of probation, or `null`.
 * @property fte - Full-time equivalent.
 * @property working_time_scheme - Working-time scheme code, or `null`.
 * @property status - Lifecycle status.
 * @property previous_contract_id - Contract this one renews, or `null`.
 * @property termination - Early end, or `null`.
 * @property document - Signed contract, or `null`.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'employment_contracts',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class EmploymentContractEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  employee_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  organization_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.String, required: true })
  contract_number!: string

  @Prop({ type: CodingSchema, required: true })
  employment_type!: CodingEntity

  @Prop({ type: DatePeriodSchema, required: true })
  period!: DatePeriodEntity

  @Prop({ type: SchemaTypes.String, default: null })
  probation_end_date!: string | null

  @Prop({ type: SchemaTypes.Number, required: true })
  fte!: number

  @Prop({ type: CodingSchema, default: null })
  working_time_scheme!: CodingEntity | null

  @Prop({
    type: SchemaTypes.String,
    enum: ['draft', 'active', 'ended', 'terminated', 'superseded'],
    default: 'draft',
  })
  status!: ContractStatus

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  previous_contract_id!: Types.ObjectId | null

  @Prop({ type: ContractTerminationSchema, default: null })
  termination!: ContractTerminationEntity | null

  @Prop({ type: SchemaTypes.Mixed, default: null })
  document!: FileRef | null

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
 * Mongoose schema generated from `EmploymentContractEntity`.
 */
export const EmploymentContractSchema = SchemaFactory.createForClass(
  EmploymentContractEntity,
)

EmploymentContractSchema.index(
  { tenant_id: 1, organization_id: 1, contract_number: 1 },
  { unique: true },
)
EmploymentContractSchema.index({ tenant_id: 1, employee_id: 1, status: 1 })
// At most one active contract per employee; a partial index can only use equality filters.
EmploymentContractSchema.index(
  { tenant_id: 1, employee_id: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
)
EmploymentContractSchema.index({ tenant_id: 1, previous_contract_id: 1 })
