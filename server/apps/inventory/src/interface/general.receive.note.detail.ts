import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IGeneralReceiveNoteDetail {
  qty: number
  batch: IMasterItemBatch
  expired: Date
  remark: string
}
