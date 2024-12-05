import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'

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
