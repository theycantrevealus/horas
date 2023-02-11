import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type AccountDocument = HydratedDocument<AccountModel>
@Schema({ collection: 'core_account' })
export class AccountModel {
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

  @Prop(raw(AccountJoin))
  created_by: AccountModel

  @Prop({ type: [Types.ObjectId], default: [] })
  access: Types.ObjectId[]

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null

  constructor() {}
}

export const AccountSchema = SchemaFactory.createForClass(AccountModel)
