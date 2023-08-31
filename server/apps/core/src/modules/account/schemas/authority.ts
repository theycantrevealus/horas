import { IAccount } from '@core/account/interface/account'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type AuthorityDocument = HydratedDocument<Authority>
@Schema({ collection: 'core_authority' })
export class Authority {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  code: string

  @Prop({
    type: SchemaTypes.String,
  })
  name: string

  @Prop({
    type: SchemaTypes.String,
  })
  remark: string

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
    this.name = parameter.first_name
    this.remark = parameter.last_name
    this.created_by = parameter.created_by
  }
}

export const AuthorityJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export interface IAuthority {
  id: string
  name: string
  code: string
}

export const AuthoritySchema = SchemaFactory.createForClass(Authority)