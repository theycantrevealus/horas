import { MasterItemJoin } from '@core/master/schemas/master.item.join'
import { raw } from '@nestjs/mongoose'

export const GeneralReceiveNoteDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  pending: { type: Number, example: 5 },
  batch: { type: String, example: 'XXXX' },
  storing_label: { type: String, example: 'XXXX' },
  expired_date: { type: Date },
  remark: { type: String, example: 'Another remark for an item' },
})
