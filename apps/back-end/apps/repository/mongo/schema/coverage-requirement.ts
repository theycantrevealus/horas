import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import { type DatePeriod } from '@repository/model/common/calendar'
import { type DayPattern } from '@repository/model/coverage-requirement'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'
import { DatePeriodSchema } from './common/date-period'

/**
 * Hydrated Mongoose document of a coverage requirement.
 */
export type CoverageRequirementDocument =
  HydratedDocument<CoverageRequirementEntity>

/**
 * Storage shape of which staff count toward a requirement. Unset criteria are `null`.
 *
 * @property workforce_category - Required category, or `null`.
 * @property profession - Required profession, or `null`.
 * @property specialty - Required specialty, or `null`.
 * @property min_clinical_level - Lowest career level that counts, or `null`.
 */
@Schema({ _id: false })
export class CoverageMatchEntity {
  @Prop({ type: CodingSchema, default: null })
  workforce_category!: Coding | null

  @Prop({ type: CodingSchema, default: null })
  profession!: Coding | null

  @Prop({ type: CodingSchema, default: null })
  specialty!: Coding | null

  @Prop({ type: CodingSchema, default: null })
  min_clinical_level!: Coding | null
}

/**
 * Mongoose schema of the staff criteria.
 */
export const CoverageMatchSchema = SchemaFactory.createForClass(CoverageMatchEntity)

/**
 * Mongo storage shape of a `CoverageRequirement`, in the collection `coverage_requirements`. Only
 * the Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property unit_id - The unit.
 * @property shift_definition_id - The shift.
 * @property day_pattern - Days it applies to.
 * @property match - Which staff count.
 * @property min_count - Minimum number of matching staff.
 * @property team_leader_required - One counted person must be team leader.
 * @property period - When the requirement applies.
 * @property status - Retired requirements are not checked.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'coverage_requirements',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class CoverageRequirementEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  unit_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true })
  shift_definition_id!: Types.ObjectId

  @Prop({
    type: SchemaTypes.String,
    enum: ['all', 'weekdays', 'weekends_holidays'],
    required: true,
  })
  day_pattern!: DayPattern

  @Prop({ type: CoverageMatchSchema, required: true })
  match!: CoverageMatchEntity

  @Prop({ type: SchemaTypes.Number, required: true })
  min_count!: number

  @Prop({ type: SchemaTypes.Boolean, required: true })
  team_leader_required!: boolean

  @Prop({ type: DatePeriodSchema, required: true })
  period!: DatePeriod

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'retired'],
    required: true,
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
 * Mongoose schema of the coverage requirement.
 */
export const CoverageRequirementSchema = SchemaFactory.createForClass(
  CoverageRequirementEntity,
)

CoverageRequirementSchema.index({ tenant_id: 1, unit_id: 1, status: 1 })
// Which requirements use a shift (a shift in use cannot be retired, HR plan 5.3 CR11).
CoverageRequirementSchema.index({
  tenant_id: 1,
  shift_definition_id: 1,
  status: 1,
})
