import { raw } from '@nestjs/mongoose'
import { MasterItemJoin } from '@schemas/master/master.item.join'

export const MaterialRequisitionDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  issued: { type: Number, example: 5 },
  remark: { type: String, example: 'Another remark for an item' },
})
