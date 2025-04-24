import { IMasterItem } from '@schemas/master/master.item.interface'

export interface IPurchaseRequisitionDetail {
  item: IMasterItem
  qty: number
  remark: string
}
