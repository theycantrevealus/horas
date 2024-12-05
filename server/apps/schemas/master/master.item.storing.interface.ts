import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'

export interface IMasterItemStoring {
  stock_point: IMasterStockPoint
  storing_label: string
  minimum: number
  maximum: number
}
