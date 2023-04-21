import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterItemSupplierDocument = HydratedDocument<MasterItemSupplier>
@Schema({ collection: 'master_item_supplier', autoIndex: true })
export class MasterItemSupplier {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true, text: true })
  code: string

  @Prop({ type: SchemaTypes.String, unique: true, text: true })
  name: string

  @Prop({ type: SchemaTypes.String, text: true, index: true })
  phone: string

  @Prop({ type: SchemaTypes.String, text: true, index: true })
  email: string

  @Prop({ type: SchemaTypes.String, text: true, index: true })
  sales_name: string

  @Prop({ type: SchemaTypes.String, text: true, index: true })
  address: string

  //{$text: { $search: 'Supplier Example', $caseSensitive: false, $diacriticSensitive: false}}

  @Prop({ type: SchemaTypes.String, text: true, index: true })
  remark: string

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
}

export const MasterItemSupplierSchema =
  SchemaFactory.createForClass(MasterItemSupplier)
