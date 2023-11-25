import { raw } from '@nestjs/mongoose'
import { Types } from 'mongoose'

export const MasterItemBrandJoin = raw({
  id: { type: String, example: `item-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'BRD00001' },
  name: { type: String, example: 'PHARMACON' },
})
