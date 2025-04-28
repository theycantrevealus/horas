import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const StockInitiationDetail = raw({
  code_item: { type: String, example: '' },
  code_batch: { type: String, example: '' },
  batch: { type: MasterItemBatchJoin, _id: false, required: false },
  qty: { type: Number, example: 10 },
  remark: { type: String, default: '-', example: 'Remark for record' },
})
