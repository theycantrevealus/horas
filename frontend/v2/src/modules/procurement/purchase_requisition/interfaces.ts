import type { SubMasterItem } from '@/modules/master/item/interfaces'

export interface ProcurementPurchaseRequisitionApproval {
  remark: string
  __v: number
}

export interface ProcurementPurchaseRequisitionDetail {
  item: SubMasterItem
  qty: number
  remark: string
}

export interface ProcurementPurchaseRequisitionAdd {
  code: string
  transaction_date: Date
  material_requisition: string
  detail: ProcurementPurchaseRequisitionDetail[]
  extras: string
  remark: string
}

export interface ProcurementPurchaseRequisitionEdit extends ProcurementPurchaseRequisitionAdd {
  __v: number
}
