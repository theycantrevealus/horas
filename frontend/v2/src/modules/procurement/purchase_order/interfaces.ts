import type { SubMasterItem } from '@/modules/master/item/interfaces'

export interface ProcurementPurchaseOrderApproval {
  remark: string
  __v: number
}

export interface ProcurementPurchaseOrderDetail {
  item: SubMasterItem
  qty: number
  price: number
  discount_type: 'n' | 'p' | 'v'
  discount_value: number
  remark: string
}

export interface ProcurementPurchaseOrderAdd {
  code: string
  transaction_date: Date
  supplier: string
  purchase_date: Date
  purchase_requisition: string
  detail: ProcurementPurchaseOrderDetail[]
  discount_type: 'n' | 'p' | 'v'
  discount_value: number
  extras: string
  remark: string
}

export interface ProcurementPurchaseOrderEdit extends ProcurementPurchaseOrderAdd {
  __v: number
}
