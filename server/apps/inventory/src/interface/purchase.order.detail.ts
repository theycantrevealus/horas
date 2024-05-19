import { IMasterItem } from '@core/master/interface/master.item'

export interface IPurchaseOrderDetail {
  item: IMasterItem
  qty: number
  price: number
  discount_type: string
  discount_value: number
  remark: string
}
