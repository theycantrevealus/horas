import { IMasterItem } from './master.item.interface'

export interface IMasterItemBatch {
  id: string
  code: string
  item: IMasterItem
  price_buy: number
  price_sell: number
  expired: Date
}
