import { raw } from '@nestjs/mongoose'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'

export const StockAuditDetail = raw({
  batch: { type: MasterItemBatchJoin, _id: false },
  qty_system: { type: Number, example: 10 },
  qty_actual: { type: Number, example: 10 },
  discrepancy: { type: Number, example: 10, default: 0 },
  remark: { type: String, example: 'Remark for record' },
})
