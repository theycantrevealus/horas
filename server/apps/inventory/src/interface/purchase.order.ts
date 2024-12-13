import { ICurrency } from '@gateway_core/i18n/interface/i18n'
import { IPurchaseOrderApproval } from '@inventory/interface/purchase.order.approval'
import { IPurchaseOrderDetail } from '@inventory/interface/purchase.order.detail'
import { IMasterItemSupplier } from '@schemas/master/master.item.supplier.interface'

export interface IPurchaseOrder {
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
}
