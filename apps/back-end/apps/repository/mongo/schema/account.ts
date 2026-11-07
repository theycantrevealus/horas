import { Prop, Schema } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { Document, SchemaTypes } from 'mongoose'
import { RawAccount } from './account.raw'
import { type IAccount } from '@repository/interface/account'

export type AccountDocument = Account & Document
@Schema()
export class Account {
  @Prop({ type: SchemaTypes.String })
  email!: string

  @Prop({ type: SchemaTypes.String })
  first_name!: string

  @Prop({ type: SchemaTypes.String })
  last_name!: string

  @Prop({ type: SchemaTypes.String })
  phone?: string

  @Prop({ type: SchemaTypes.Date })
  birthdate?: Date

  @Prop({ type: SchemaTypes.String })
  status!: string

  @Prop(RawAccount)
  created_by: IAccount

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at?: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at?: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at?: Date | null
}
