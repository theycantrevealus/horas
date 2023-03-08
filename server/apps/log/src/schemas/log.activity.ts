import { Account } from '@core/account/schemas/account.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type LogActivityDocument = HydratedDocument<LogActivity>

@Schema({ collection: 'core_log_activity' })
export class LogActivity {
  @Prop(
    raw({
      email: { type: String },
      first_name: { type: String },
      last_name: { type: String },
    })
  )
  account: Account

  @Prop({
    type: SchemaTypes.String,
    enum: ['POST', 'DELETE', 'PATCH', 'PUT'],
  })
  method: string

  @Prop({
    type: SchemaTypes.String,
  })
  collection_name: string

  @Prop({
    type: SchemaTypes.String,
  })
  identifier: string

  @Prop({
    type: SchemaTypes.String,
  })
  log_meta: string

  @Prop({
    type: SchemaTypes.String,
    minlength: 1,
    maxlength: 1,
  })
  action: string

  @Prop({
    type: SchemaTypes.Mixed,
  })
  old_meta: any

  @Prop({
    type: SchemaTypes.Mixed,
  })
  new_meta: any

  @Prop({
    type: SchemaTypes.Number,
  })
  doc_v: number

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  logged_at: Date
}

export const LogActivitySchema = SchemaFactory.createForClass(LogActivity)
