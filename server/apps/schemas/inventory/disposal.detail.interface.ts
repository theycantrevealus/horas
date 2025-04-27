import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IStockDisposalDetail {
  batch: IMasterItemBatch
  qty: number
  type:
    | 'Expired Products'
    | 'Damaged Goods'
    | 'Obsolete Products'
    | 'Quality Issues'
  remark: string
}
