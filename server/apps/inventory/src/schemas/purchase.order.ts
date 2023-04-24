import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { CurrencyJoin, ICurrency } from '@core/i18n/schemas/i18n'
import {
  IMasterItemSupplier,
  MasterItemSupplierJoin,
} from '@core/master/schemas/master.item.supplier.join'
import {
  IPurchaseOrderDetail,
  PurchaseOrderDetail,
} from '@inventory/schemas/purchase.order.detail'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export const PurchaseOrderJoin = raw({
  id: {
    type: String,
    example: `purchase_order-${new Types.ObjectId().toString()}`,
  },
  code: { type: String, example: 'PO00001' },
  supplier: { type: MasterItemSupplierJoin },
  purchase_date: { type: Date },
  remark: { type: String },
  created_by: { type: AccountJoin },
})

export const PurchaseOrderApprovalHistory = raw({
  status: {
    type: String,
    enum: ['new', 'need_approval', 'approved', 'declined'],
    default: 'new',
  },
  logged_at: {
    type: Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  },
  remark: { type: SchemaTypes.String },
  created_by: { type: raw(AccountJoin) },
})

export class IPurchaseOrderApproval {
  @Prop({
    type: String,
    enum: ['new', 'approved', 'declined'],
    default: 'new',
  })
  status: string

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  logged_at: Date

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  constructor(data: any) {
    this.status = data.status
    this.remark = data.remark
    this.created_by = data.created_at
  }
}

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

  @Prop({ type: [PurchaseOrderApprovalHistory], _id: false })
  approval_history: IPurchaseOrderApproval[]

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

export class IPurchaseOrder {
  id: string
  code: string

  extras: any

  supplier: IMasterItemSupplier

  purchase_date: Date

  locale: ICurrency

  detail: IPurchaseOrderDetail[]

  total: number

  discount_type: string

  discount_value: number

  grand_total: number

  status: string

  approval_history: IPurchaseOrderApproval[]

  remark: string

  constructor(data: any) {
    this.id = data.id
    this.code = data.code
    this.extras = data.extras
    this.purchase_date = data.purchase_date
    this.locale = data.locale
    this.supplier = data.supplier
    this.detail = data.detail
    this.total = data.total
    this.discount_type = data.discount_type
    this.discount_value = data.discount_value
    this.grand_total = data.grand_total
    this.status = data.status
    this.approval_history = data.approval_history
    this.remark = data.remark
  }
}
