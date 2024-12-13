import { IMasterItem } from '@schemas/master/master.item.interface'

export interface IPurchaseOrderDetail {
  item: IMasterItem
  qty: number
  price: number
  discount_type: string
  discount_value: number
  remark: string
}
