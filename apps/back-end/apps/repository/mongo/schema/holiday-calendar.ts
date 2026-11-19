import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'
import { type LocalizedText } from '@repository/model/common/localized-text'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'
import { LocalizedTextSchema } from './common/localized-text'

/**
 * Hydrated Mongoose document of a holiday calendar.
 */
export type HolidayCalendarDocument = HydratedDocument<HolidayCalendarEntity>

/**
 * Storage shape of one holiday of a calendar.
 *
 * @property date - The day, `YYYY-MM-DD`.
 * @property name - Name per language.
 * @property kind - Public holiday, collective leave or local holiday.
 * @property source - Loaded from an import or added by HR.
 * @property status - Removed days are kept so an import does not bring them back.
 * @property import_id - Import that loaded it, or `null`.
 */
@Schema({ _id: false })
export class HolidayEntryEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  date!: string

  @Prop({ type: [LocalizedTextSchema], default: [] })
  name!: LocalizedText[]

  @Prop({
    type: SchemaTypes.String,
    enum: ['public', 'collective_leave', 'local'],
    required: true,
  })
  kind!: 'public' | 'collective_leave' | 'local'

  @Prop({
    type: SchemaTypes.String,
    enum: ['imported', 'manual'],
    required: true,
  })
  source!: 'imported' | 'manual'

  @Prop({
    type: SchemaTypes.String,
    enum: ['active', 'removed'],
    required: true,
  })
  status!: 'active' | 'removed'

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  import_id!: Types.ObjectId | null
}

/**
 * Mongoose schema of one holiday.
 */
export const HolidayEntrySchema = SchemaFactory.createForClass(HolidayEntryEntity)

/**
 * Mongo storage shape of a `HolidayCalendar`, in the collection `holiday_calendars`. Only the
 * Mongo repository uses it.
 *
 * @property tenant_id - Tenant that owns the calendar; absent for platform calendars.
 * @property schema_version - Version of the stored shape.
 * @property version - Optimistic-concurrency counter.
 * @property code - Calendar code.
 * @property year - Calendar year.
 * @property country - ISO 3166-1 alpha-2 code.
 * @property subdivision - ISO 3166-2 code, or `null`.
 * @property holidays - The days.
 * @property last_import_id - Latest import that loaded the calendar, or `null`.
 * @property created_by - Who created the record.
 */
@Schema({
  collection: 'holiday_calendars',
  versionKey: 'version',
  optimisticConcurrency: true,
})
export class HolidayCalendarEntity {
  @Prop({ type: SchemaTypes.ObjectId, required: false })
  tenant_id?: Types.ObjectId

  @Prop({ type: SchemaTypes.Number, required: true })
  schema_version!: number

  version!: number

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: SchemaTypes.Number, required: true })
  year!: number

  @Prop({ type: SchemaTypes.String, required: true })
  country!: string

  @Prop({ type: SchemaTypes.String, default: null })
  subdivision!: string | null

  @Prop({ type: [HolidayEntrySchema], default: [] })
  holidays!: HolidayEntryEntity[]

  @Prop({ type: SchemaTypes.ObjectId, default: null })
  last_import_id!: Types.ObjectId | null

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
 * Mongoose schema of the holiday calendar.
 */
export const HolidayCalendarSchema =
  SchemaFactory.createForClass(HolidayCalendarEntity)

// One calendar per code and year in a tenant (HR plan 5.2 HC1).
HolidayCalendarSchema.index({ tenant_id: 1, code: 1, year: 1 }, { unique: true })
HolidayCalendarSchema.index({ tenant_id: 1, country: 1, subdivision: 1 })
// Calendars with a day of a kind on a date, across tenants (the collective leave job), so this index
// does not start with `tenant_id` (`database.md` 7.2).
HolidayCalendarSchema.index({ 'holidays.date': 1, 'holidays.kind': 1 })
