import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IStockAdjustmentDetail {
  batch: IMasterItemBatch
  qty: number
  remark: string
}
