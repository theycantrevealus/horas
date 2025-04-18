import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const MutationDetail = raw({
  batch: { type: MasterItemBatchJoin, _id: false },
  qty: { type: Number, example: 10 },
  remark: { type: String, example: 'Another remark for an item' },
})
