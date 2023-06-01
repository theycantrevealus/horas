import { IAccount } from '@core/account/interface/account'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  IMenu,
  IMenuPermission,
  MenuJoin,
  MenuPermissionJoin,
} from '@core/menu/schemas/menu.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type AccountDocument = HydratedDocument<Account>
@Schema({ collection: 'core_account' })
export class Account {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    lowercase: true,
    unique: true,
  })
  code: string

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
    unique: true,
  })
  phone: string

  @Prop({
    unique: false,
    type: [MenuJoin],
    _id: false,
  })
  access: IMenu[]

  @Prop({
    type: [MenuPermissionJoin],
    default: [],
    required: false,
    _id: false,
  })
  permission: IMenuPermission[]

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null

  constructor(parameter: IAccount) {
    this.code = parameter.code
    this.first_name = parameter.first_name
    this.last_name = parameter.last_name
    this.email = parameter.email
    this.phone = parameter.phone
    this.access = parameter.access
    this.permission = parameter.permission
    this.created_by = parameter.created_by
  }
}

export const AccountSchema = SchemaFactory.createForClass(Account)
