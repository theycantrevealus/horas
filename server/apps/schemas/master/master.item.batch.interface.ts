import { IMasterItemBrand } from './master.item.brand.interface'
import { IMasterItem } from './master.item.interface'

export interface IMasterItemBatch {
  id: string
  code: string
  item: IMasterItem
  brand: IMasterItemBrand | null
  price_buy: number
  price_sell: number
  expired: Date
}
