import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
import { Account } from '@schemas/account/account.model'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type LogLoginDocument = HydratedDocument<LogLogin>

@Schema({ collection: 'core_log_login' })
export class LogLogin {
  constructor() {}
  @Prop(AccountJoin)
  account: Account

  @Prop({
    type: SchemaTypes.String,
  })
  iden_pass: string

  @Prop({
    type: SchemaTypes.String,
  })
  token: string

  @Prop({
    type: SchemaTypes.String,
  })
  log_meta: string

  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  expired_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  logged_at: Date
}

export const LogLoginSchema = SchemaFactory.createForClass(LogLogin)
