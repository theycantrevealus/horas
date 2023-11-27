import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { CurrencyJoin, ICurrency } from '@core/i18n/schemas/i18n'
import { IMasterItemSupplier } from '@core/master/interface/master.item.supplier'
import { MasterItemSupplierJoin } from '@core/master/schemas/master.item.supplier.join'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { PurchaseOrderApproval } from '@inventory/schemas/purchase.order.approval'
import { PurchaseOrderDetail } from '@inventory/schemas/purchase.order.detail'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>

@Schema({ collection: 'inventory_purchase_order' })
export class PurchaseOrder {
  @Prop({ type: SchemaTypes.String, unique: true })
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

  @Prop(raw(CurrencyJoin))
  locale: ICurrency

  @Prop({
    type: [PurchaseOrderDetail],
    _id: false,
  })
  detail: IPurchaseOrderDetail[]

  @Prop({
    type: SchemaTypes.Number,
  })
  total: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['p', 'v', 'n'],
    default: 'n',
  })
  discount_type: string

  @Prop({
    type: SchemaTypes.Number,
  })
  discount_value: number

  @Prop({
    type: SchemaTypes.Number,
  })
  grand_total: number

  @Prop({
    type: SchemaTypes.String,
    enum: ['new', 'need_approval', 'approved', 'declined'],
    default: 'new',
  })
  status: string

  @Prop({ type: [PurchaseOrderApproval], _id: false })
  approval_history: IPurchaseOrderApproval[]

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder)
