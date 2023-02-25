import { IAccount } from '@core/account/interface/account'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
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

  @Prop({ type: [Types.ObjectId], default: [] })
  access: Types.ObjectId[]

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

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

  constructor(parameter: IAccount) {
    this.first_name = parameter.first_name
    this.last_name = parameter.last_name
    this.email = parameter.email
    this.phone = parameter.phone
    this.access = parameter.access
    this.created_by = parameter.created_by
  }
}

export const AccountSchema = SchemaFactory.createForClass(AccountModel)
