import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type AccountDocument = HydratedDocument<Account>
@Schema({ collection: 'core_account' })
export class Account {
  @Prop({
    type: SchemaTypes.String,
    min: 8,
    max: 24,
    unique: true,
  })
  email: string

  @Prop({ type: SchemaTypes.String, min: 8, max: 24 })
  password: string

  @Prop({ type: SchemaTypes.String, min: 8, max: 24 })
  first_name: string

  @Prop({ type: SchemaTypes.String, min: 8, max: 24 })
  last_name: string

  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  phone: string

  @Prop({ type: Types.ObjectId, ref: Account.name })
  @Type(() => Account)
  created_by: Account

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null

  constructor() {}
}

export const AccountSchema = SchemaFactory.createForClass(Account)
