import { IMasterItem } from '@gateway_core/master/interface/master.item'

export interface IGeneralReceiveNoteDetail {
  item: IMasterItem
  qty: number
  pending: number
  batch: string
  storing_label: string
  expired_date: Date
  remark: string
}
