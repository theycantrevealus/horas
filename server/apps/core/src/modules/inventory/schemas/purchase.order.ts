import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  IPurchaseOrderDetail,
  PurchaseOrderDetail,
} from '@core/inventory/schemas/purchase.order.detail'
import {
  IMasterItemSupplier,
  MasterItemSupplierJoin,
} from '@core/master/schemas/master.item.supplier.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>
@Schema({ collection: 'inventory_purchase_order' })
export class PurchaseOrder {
  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  @Prop(raw(MasterItemSupplierJoin))
  supplier: IMasterItemSupplier

  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  purchase_date: Date

  @Prop({
    type: [PurchaseOrderDetail],
  })
  detail: IPurchaseOrderDetail[]

  @Prop({ type: SchemaTypes.String })
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
export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder)
