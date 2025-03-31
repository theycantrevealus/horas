import { IMasterItem } from '@schemas/master/master.item.interface'

export interface IMaterialRequisitionDetail {
  item: IMasterItem
  qty: number
  issued: number
  remark: string
}
