import { Account } from '@core/account/schemas/account.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type LogLoginDocument = HydratedDocument<LogLogin>

@Schema({ collection: 'core_log_login' })
export class LogLogin {
  @Prop(
    raw({
      _id: { type: Types.ObjectId },
      email: { type: String },
      first_name: { type: String },
      last_name: { type: String },
    })
  )
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
    default: () => new TimeManagement().getTimezoneV2('Asia/Jakarta'),
    required: true,
  })
  logged_at: Date
}

export const LogLoginSchema = SchemaFactory.createForClass(LogLogin)
