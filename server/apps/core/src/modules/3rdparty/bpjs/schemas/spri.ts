import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { i18nComponent, Ii18nComponent } from '@core/i18n/schemas/i18n'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type BPJSSPRIDocument = HydratedDocument<BPJSSPRI>
@Schema({ collection: 'core_i18n' })
export class BPJSSPRI {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    min: 2,
    max: 2,
    required: true,
    unique: true,
  })
  language_code: string

  @Prop({
    type: SchemaTypes.String,
    min: 2,
    max: 2,
    required: true,
    unique: true,
  })
  iso_2_digits: string

  @Prop({
    type: SchemaTypes.String,
    min: 3,
    max: 3,
    required: true,
    unique: true,
  })
  iso_3_digits: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

  @Prop({
    type: SchemaTypes.String,
    default: '',
  })
  currency: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['narrow', 'short', 'long'],
    default: 'numeric',
  })
  datetime_weekday: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['narrow', 'short', 'long'],
    default: 'long',
  })
  datetime_era: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric'],
    default: 'numeric',
  })
  datetime_year: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
    default: 'long',
  })
  datetime_month: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric'],
    default: 'numeric',
  })
  datetime_day: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric'],
    default: 'numeric',
  })
  datetime_hour: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric'],
    default: 'numeric',
  })
  datetime_minute: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['2-digit', 'numeric'],
    default: 'numeric',
  })
  datetime_second: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['short', 'long'],
    default: 'long',
  })
  datetime_timezone_name: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    unique: false,
    type: [i18nComponent],
    _id: false,
  })
  components: Ii18nComponent[]

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const BPJSSPRISchema = SchemaFactory.createForClass(BPJSSPRI)
