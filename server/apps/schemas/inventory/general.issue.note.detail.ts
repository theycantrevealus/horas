import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const GeneralIssueNoteDetail = raw({
  batch: { type: MasterItemBatchJoin, _id: false },
  qty: { type: Number, example: 10 },
  issued: { type: Number, example: 5 },
  remark: { type: String, example: 'Another remark for an item' },
})
