import { MasterStockPointJoin } from '@core/master/schemas/master.stock.point.join'
import { raw } from '@nestjs/mongoose'

export const MasterItemStoring = raw({
  stock_point: { type: MasterStockPointJoin, _id: false },
  storing_label: { type: String },
  minimum: { type: Number },
  maximum: { type: Number },
})
