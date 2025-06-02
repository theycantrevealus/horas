import { raw } from '@nestjs/mongoose'

import { MasterItemBrandJoin } from './master.item.brand.join'
import { MasterItemJoin } from './master.item.join'

export const MasterItemBatchJoin = raw({
  id: { type: String },
  code: { type: String },
  item: { type: MasterItemJoin, _id: false },
  brand: { type: MasterItemBrandJoin, _id: false },
  expired: { type: Date },
})
