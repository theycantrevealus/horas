import { IMasterItem } from '@core/master/interface/master.item'
import { IMasterItemBatch } from '@core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@core/master/interface/master.stock.point'

export class StockDTO {
  item: IMasterItem
  batch: IMasterItemBatch
  stock_point: IMasterStockPoint
  qty: number
  type: string
  transaction: string
  transaction_id: string
}
