import { IMasterItem } from '@schemas/master/master.item.interface'
import { IMasterItemUnit } from '@schemas/master/master.item.unit.interface'

export interface IMaterialRequisitionDetail {
  item: IMasterItem
  qty: number
  unit: IMasterItemUnit
  issued: number
  remark: string
}
