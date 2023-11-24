import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { IMenu } from '@core/menu/interfaces/menu.interface'
import { MenuJoin } from '@core/menu/schemas/menu.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const i18nComponent = raw({
  component: { type: String },
  translation: { type: String },
  menu: { type: MenuJoin, _id: false },
})

export interface Ii18nComponent {
  component: string
  translation: string
  menu: IMenu
}

export class Ci18nComponent {
  @ApiProperty({
    type: String,
    example: '',
  })
  component: string

  @ApiProperty({
    type: String,
    example: '',
  })
  translation: string

  @ApiProperty({
    type: MenuJoin,
    required: false,
  })
  menu: IMenu
}

export const CurrencyJoin = raw({
  language_code: { type: String },
  iso_2_digits: { type: String },
  currency: { type: String },
  timezone: { type: String },
})

export class CCurrency {
  @ApiProperty({
    type: String,
    example: '',
  })
  language_code: string

  @ApiProperty({
    type: String,
    example: '',
  })
  iso_2_digits: string

  @ApiProperty({
    type: String,
    example: '',
  })
  currency: string

  @ApiProperty({
    type: String,
    example: 'Asia/Jakarta',
  })
  timezone: string
}

export interface ICurrency {
  language_code: string
  iso_2_digits: string
  currency: string
  timezone: string
}

export type i18nDocument = HydratedDocument<i18n>
@Schema({ collection: 'core_i18n' })
export class i18n {
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

export const i18nSchema = SchemaFactory.createForClass(i18n)
