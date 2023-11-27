import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type LicenseDocument = HydratedDocument<License>
@Schema({ collection: 'core_license' })
export class License {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  country_code: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  state: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  city: string

  @Prop({
    type: SchemaTypes.String,
    unique: true,
    required: true,
  })
  organization: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  unit: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  pic: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  email: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  password: string

  @Prop({
    type: SchemaTypes.Number,
    min: 1,
    required: true,
  })
  age: number

  @Prop(AccountJoin)
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

export const LicenseSchema = SchemaFactory.createForClass(License)
