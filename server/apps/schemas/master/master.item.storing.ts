import { raw } from '@nestjs/mongoose'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'

export const MasterItemStoring = raw({
  stock_point: { type: MasterStockPointJoin, _id: false },
  storing_label: { type: String },
  minimum: { type: Number },
  maximum: { type: Number },
})
