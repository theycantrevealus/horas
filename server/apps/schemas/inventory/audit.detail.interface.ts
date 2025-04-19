import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IStockAuditDetail {
  batch: IMasterItemBatch
  qty_system: number
  qty_actual: number
  discrepancy: number
  remark: string
}

export interface IStockAuditDetailDTO {
  batch: IMasterItemBatch
  qty_actual: number
  remark: string
}
