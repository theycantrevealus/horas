import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type Coding } from '@repository/model/common/coding'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { CodingSchema } from './common/coding'
import { DatePeriodEntity, DatePeriodSchema } from './common/date-period'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a code concept.
 */
export type CodeConceptDocument = HydratedDocument<CodeConceptEntity>

/**
 * Mongo storage shape of a `CodeConcept`, in the collection `code_concepts`. Only the Mongo
 * repository uses it; the rest of the application uses the `CodeConcept` model. `minimize` is
 * off so an empty `properties` object is stored as given.
 *
 * @property tenant_id - Tenant that owns the concept; absent for platform-wide concepts.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property system - Code system, carrying the jurisdiction.
 * @property code - Code inside the system.
 * @property display - Text per language.
 * @property properties - Attributes that rules read.
 * @property mappings - Equivalent codes in universal systems.
 * @property period - When the concept may be used, or `null` for always.
 * @property status - Retired concepts stay valid on old records but cannot be used on new ones.
 * @property created_by - Who created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({
  collection: 'code_concepts',
  versionKey: 'version',
  optimisticConcurrency: true,
  minimize: false,
})
export class CodeConceptEntity {
  @Prop({ type: SchemaTypes.ObjectId })
  tenant_id?: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  system!: string

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  display!: LocalizedText[]

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  properties!: Record<string, unknown>

  @Prop({ type: [CodingSchema], default: [] })
  mappings!: Coding[]

  @Prop({ type: DatePeriodSchema, default: null })
  period!: DatePeriodEntity | null

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
 * Mongoose schema generated from `CodeConceptEntity`.
 */
export const CodeConceptSchema = SchemaFactory.createForClass(CodeConceptEntity)

CodeConceptSchema.index({ tenant_id: 1, system: 1, code: 1 }, { unique: true })
CodeConceptSchema.index({ tenant_id: 1, system: 1, status: 1 })
