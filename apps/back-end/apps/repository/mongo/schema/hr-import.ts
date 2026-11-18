import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import {
  type HrImportKind,
  type HrImportStatus,
} from '@repository/model/hr-import'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { ActorStampEntity, ActorStampSchema } from './common/actor-stamp'

/**
 * Hydrated Mongoose document of an HR import.
 */
export type HrImportDocument = HydratedDocument<HrImportEntity>

/**
 * Storage shape of what an import loads into: a roster, or a holiday calendar and year.
 *
 * @property roster_id - Roster of a roster import.
 * @property calendar_code - Calendar code of a holiday import.
 * @property year - Calendar year of a holiday import.
 */
@Schema({ _id: false })
export class HrImportTargetEntity {
  @Prop({ type: SchemaTypes.ObjectId })
  roster_id?: Types.ObjectId

  @Prop({ type: SchemaTypes.String })
  calendar_code?: string

  @Prop({ type: SchemaTypes.Number })
  year?: number
}

/**
 * Mongoose schema of the import target.
 */
export const HrImportTargetSchema =
  SchemaFactory.createForClass(HrImportTargetEntity)

/**
 * Storage shape of the file reference of an import.
 */
@Schema({ _id: false })
export class HrImportFileEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  file_id!: string

  @Prop({ type: SchemaTypes.String, required: true })
  content_type!: string

  @Prop({ type: SchemaTypes.String, required: true })
  sha256!: string
}

/**
 * Mongoose schema of the file reference.
 */
export const HrImportFileSchema = SchemaFactory.createForClass(HrImportFileEntity)

/**
 * Storage shape of the row counts of an import.
 */
@Schema({ _id: false })
export class HrImportCountsEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  rows!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  valid!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  invalid!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  created!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  updated!: number

  @Prop({ type: SchemaTypes.Number, required: true })
  skipped!: number
}

/**
 * Mongoose schema of the row counts.
 */
export const HrImportCountsSchema =
  SchemaFactory.createForClass(HrImportCountsEntity)

/**
 * Storage shape of one row error: a position and a code, never a cell value.
 */
@Schema({ _id: false })
export class HrImportErrorEntity {
  @Prop({ type: SchemaTypes.Number, required: true })
  row!: number

  @Prop({ type: SchemaTypes.String, default: null })
  column!: string | null

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string
}

/**
 * Mongoose schema of a row error.
 */
export const HrImportErrorSchema = SchemaFactory.createForClass(HrImportErrorEntity)

/**
 * Storage shape of the failure of an import.
 */
@Schema({ _id: false })
export class HrImportFailureEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  error!: string

  @Prop({ type: SchemaTypes.Boolean, required: true })
  retryable!: boolean
}

/**
 * Mongoose schema of the failure.
 */
export const HrImportFailureSchema =
  SchemaFactory.createForClass(HrImportFailureEntity)

/**
 * Mongo storage shape of an `HrImport`, in the collection `hr_imports`. Only the Mongo repository
 * uses it. The file itself is not stored (HR plan D3), only its reference and hash.
 *
 * @property tenant_id - Tenant that owns the record.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property kind - What was imported.
 * @property target - What it loads into.
 * @property file - Reference and hash of the file.
 * @property status - Where the import is.
 * @property counts - Row counts.
 * @property errors - Row errors, as codes.
 * @property uploaded - Who uploaded it and when.
 * @property applied - Who applied it and when, or `null`.
 * @property failure - Why it failed, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'hr_imports',
  versionKey: 'version',
  optimisticConcurrency: true,
  // The collection design names a field `errors`, which Mongoose reserves for validation errors.
  // Reads are lean and writes go through `create` and `findOneAndUpdate`, where the path stores
  // and reads back correctly (checked); a document method that reads `doc.errors` must not be used.
  suppressReservedKeysWarning: true,
})
export class HrImportEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  tenant_id!: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['roster_assignments', 'holiday_calendar'],
    required: true,
  })
  kind!: HrImportKind

  @Prop({ type: HrImportTargetSchema, required: true })
  target!: HrImportTargetEntity

  @Prop({ type: HrImportFileSchema, required: true })
  file!: HrImportFileEntity

  @Prop({
    type: SchemaTypes.String,
    enum: [
      'uploaded',
      'validated',
      'invalid',
      'applying',
      'applied',
      'failed',
      'cancelled',
    ],
    required: true,
  })
  status!: HrImportStatus

  @Prop({ type: HrImportCountsSchema, required: true })
  counts!: HrImportCountsEntity

  @Prop({ type: [HrImportErrorSchema], default: [] })
  errors!: HrImportErrorEntity[]

  @Prop({ type: ActorStampSchema, required: true })
  uploaded!: ActorStampEntity

  @Prop({ type: ActorStampSchema, default: null })
  applied!: ActorStampEntity | null

  @Prop({ type: HrImportFailureSchema, default: null })
  failure!: HrImportFailureEntity | null

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
 * Mongoose schema of the HR import.
 */
export const HrImportSchema = SchemaFactory.createForClass(HrImportEntity)

HrImportSchema.index({ tenant_id: 1, kind: 1, status: 1, created_at: -1 })
HrImportSchema.index({ tenant_id: 1, 'file.sha256': 1, kind: 1 })
