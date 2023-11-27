import { raw } from '@nestjs/mongoose'

export const MasterItemCategoryJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})
