import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ICurrency } from '@gateway_core/i18n/interface/i18n'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { CurrencyJoin } from '@schemas/i18n/i18n.join'
import { PurchaseOrderApproval } from '@schemas/inventory/purchase.order.approval'
import { PurchaseOrderDetail } from '@schemas/inventory/purchase.order.detail'
import { IMasterItemSupplier } from '@schemas/master/master.item.supplier.interface'
import { MasterItemSupplierJoin } from '@schemas/master/master.item.supplier.join'
import {
  DocumentHistoryJoin,
  IDocumentHistory,
} from '@utility/schemas/document_history'
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

  @Prop(MasterItemSupplierJoin)
  supplier: IMasterItemSupplier

  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  purchase_date: Date

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
  created_by: IAccount

  @Prop({ type: AccountJoin, required: false })
  updated_by: IAccount

  @Prop(CurrencyJoin)
  locale: ICurrency

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

  @Prop({ type: [DocumentHistoryJoin], _id: false, required: false })
  history: IDocumentHistory[]
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder)
