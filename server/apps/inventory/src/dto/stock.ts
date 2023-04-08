import { IMasterItemBatch } from '@core/master/schemas/master.item.batch.join'
import { IMasterItem } from '@core/master/schemas/master.item.join'
import { IMasterStockPoint } from '@core/master/schemas/master.stock.point.join'

export class StockDTO {
  item: IMasterItem
  batch: IMasterItemBatch
  stock_point: IMasterStockPoint
  qty: number
  type: string
  transaction: string
  transaction_id: string
}
