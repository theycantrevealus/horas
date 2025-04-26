import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { PurchaseOrderApproval } from '@schemas/inventory/purchase.order.approval'
import { PurchaseOrderDetail } from '@schemas/inventory/purchase.order.detail'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { IMasterItemSupplier } from '@schemas/master/master.item.supplier.interface'
import { MasterItemSupplierJoin } from '@schemas/master/master.item.supplier.join'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { IPurchaseRequisition } from './purchase.requisition.interface'

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrder>

/**
 * @class PurchaseOrder
 * @description If purchase requisition is approved, user can process procurement. It will recorded here
 * Purchase Order (PO) is a commercial document issued by a buyer to a seller, indicating the type, quantities, and agreed prices for products or services to be purchased
 */
@Schema({ collection: 'inventory_purchase_order' })
export class PurchaseOrder {
  /**
   * Unique identifier for the stock audit.
   * @type { string }
   */
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  /**
   * @type { ILocale }
   * @description Stock audit locale
   */
  @Prop(LocaleJoin)
  locale: ILocale

  /**
   * @type { string }
   * @description Audit code (it will generated if not defined)
   */
  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  /**
   * @type { IMasterItemSupplier }
   * @description Supplier of procurement
   */
  @Prop(MasterItemSupplierJoin)
  supplier: IMasterItemSupplier

  /**
   * @type { Date }
   * @description Time of purchase date
   */
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  purchase_date: Date

  /**
   * @type { IPurchaseRequisition }
   * @description Refer to purchase requisition
   */
  @Prop(LocaleJoin)
  purchase_requisition: IPurchaseRequisition

  /**
   * @type { IPurchaseOrderDetail[] }
   * @description PO detail
   */
  @Prop({
    type: [PurchaseOrderDetail],
    _id: false,
  })
  detail: IPurchaseOrderDetail[]

  /**
   * @type { number }
   * @description Total value of procurement
   */
  @Prop({
    type: SchemaTypes.Number,
  })
  total: number

  /**
   * @type { string }
   * @description If procurement have discount
   * - p : percentage
   * - v : value
   * - n : nonde
   */
  @Prop({
    type: SchemaTypes.String,
    enum: ['p', 'v', 'n'],
    default: 'n',
  })
  discount_type: string

  /**
   * @type { string }
   * @description Discount value. Will ignored if discount type is set 'n'
   */
  @Prop({
    type: SchemaTypes.Number,
  })
  discount_value: number

  /**
   * @type { string }
   * @description Total value of procurement after discount
   */
  @Prop({
    type: SchemaTypes.Number,
  })
  grand_total: number

  /**
   * @type { string }
   * @description Approval status of purchase order
   */
  @Prop({
    type: SchemaTypes.String,
    enum: ['new', 'need_approval', 'approved', 'declined'],
    default: 'new',
  })
  status: string

  /**
   * @type { IPurchaseOrderApproval[] }
   * @description Approval history
   */
  @Prop({ type: [PurchaseOrderApproval], _id: false })
  approval_history: IPurchaseOrderApproval[]

  /**
   * @type { any }
   * @description Additional field for extra data
   */
  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  /**
   * @type { string }
   * @description Adjustment remark
   */
  @Prop({ type: SchemaTypes.String })
  remark: string

  /**
   * @type { IAccount }
   * @description Account who create the adjustment
   */
  @Prop(AccountJoin)
  created_by: IAccount

  /**
   * @type { Date }
   * @description System record of created time
   */
  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  /**
   * @type { Date }
   * @description System record of last update time
   */
  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  /**
   * @type { Date }
   * @description System record of deleted time (soft-delete)
   */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder)
