import { AccountJoin } from '@core/account/schemas/account.join'
import { Account } from '@core/account/schemas/account.model'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterItemSupplierDocument =
  HydratedDocument<MasterItemSupplierModel>
@Schema({ collection: 'master_item_supplier' })
export class MasterItemSupplierModel {
  @Prop({ type: SchemaTypes.String, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string

  @Prop({ type: SchemaTypes.String })
  phone: string

  @Prop({ type: SchemaTypes.String })
  email: string

  @Prop({ type: SchemaTypes.String })
  seller_name: string

  @Prop({ type: SchemaTypes.String })
  address: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(raw(AccountJoin))
  created_by: Account

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
}

export const MasterItemSupplierSchema = SchemaFactory.createForClass(
  MasterItemSupplierModel
)
