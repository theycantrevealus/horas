import { AccountJoin } from '@core/account/schemas/account.join'
import { AccountModel } from '@core/account/schemas/account.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type LogLoginDocument = HydratedDocument<LogLogin>

@Schema({ collection: 'core_log_login' })
export class LogLogin {
  @Prop(raw(AccountJoin))
  account: AccountModel

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
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  logged_at: Date
}

export const LogLoginSchema = SchemaFactory.createForClass(LogLogin)
