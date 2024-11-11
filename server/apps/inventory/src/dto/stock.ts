import { IMasterItem } from '@gateway_core/master/interface/master.item'
import { IMasterItemBatch } from '@gateway_core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'

export class StockDTO {
  item: IMasterItem
  batch: IMasterItemBatch
  stockPointOrigin: IMasterStockPoint
  stockPointTarget: IMasterStockPoint
  qty: number
  type: string
  transaction: string
  transactionId: string
}
