import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IMutationDetail {
  batch: IMasterItemBatch
  qty: number
  remark: string
}
