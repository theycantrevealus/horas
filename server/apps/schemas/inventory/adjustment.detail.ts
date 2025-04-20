import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const StockAdjustmentDetail = raw({
  batch: { type: MasterItemBatchJoin, _id: false },
  qty: { type: Number, example: 10 },
  remark: { type: String, example: 'Remark for record' },
})
