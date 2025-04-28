import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IStockInitiationDetail {
  batch: IMasterItemBatch | null
  qty: number
  remark: string
}
