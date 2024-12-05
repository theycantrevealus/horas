import { raw } from '@nestjs/mongoose'
import { MasterItemJoin } from '@schemas/master/master.item.join'

export const GeneralReceiveNoteDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  pending: { type: Number, example: 5 },
  batch: { type: String, example: 'XXXX' },
  storing_label: { type: String, example: 'XXXX' },
  expired_date: { type: Date },
  remark: { type: String, example: 'Another remark for an item' },
})
