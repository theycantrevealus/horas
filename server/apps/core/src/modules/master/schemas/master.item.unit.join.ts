import { raw } from '@nestjs/mongoose'

export const MasterItemUnitJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})
