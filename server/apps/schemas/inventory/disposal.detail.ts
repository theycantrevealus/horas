import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const StockDisposalDetail = raw({
  batch: { type: MasterItemBatchJoin, _id: false },
  qty: { type: Number, example: 10 },
  type: {
    type: String,
    enum: [
      'Expired Products',
      'Damaged Goods',
      'Obsolete Products',
      'Quality Issues',
    ],
  },
  remark: { type: String, default: '-', example: 'Remark for record' },
})
