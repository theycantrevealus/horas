import { IMasterItem } from '@schemas/master/master.item.interface'

export interface IGeneralReceiveNoteDetail {
  item: IMasterItem
  qty: number
  pending: number
  batch: string
  storing_label: string
  expired_date: Date
  remark: string
}
