import { raw } from '@nestjs/mongoose'
import { MasterItemJoin } from '@schemas/master/master.item.join'
import { MasterItemUnitJoin } from '@schemas/master/master.item.unit.join'

export const MaterialRequisitionDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  unit: { type: MasterItemUnitJoin, _id: false },
  issued: { type: Number, example: 5, default: 0 },
  remark: { type: String, example: 'Another remark for an item' },
})
