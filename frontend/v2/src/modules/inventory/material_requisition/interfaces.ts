import type { SubMasterItem } from '@/modules/master/item/interfaces'
import type { SubMasterStockPoint } from '@/modules/master/stock_point/interfaces'

export interface InventoryMaterialRequisitionApproval {
  remark: string
  __v: number
}

export interface InventoryMaterialRequisitionDetail {
  item: SubMasterItem
  qty: number
  remark: string
}

export interface InventoryMaterialRequisitionAdd {
  code: string
  transaction_date: Date
  stock_point: SubMasterStockPoint
  detail: InventoryMaterialRequisitionDetail[]
  extras: string
  remark: string
}

export interface InventoryMaterialRequisitionEdit extends InventoryMaterialRequisitionAdd {
  __v: number
}
