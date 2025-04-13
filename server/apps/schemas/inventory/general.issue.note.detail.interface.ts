import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'

export interface IGeneralIssueNoteDetail {
  batch: IMasterItemBatch
  qty: number
  issued: number
  remark: string
}
