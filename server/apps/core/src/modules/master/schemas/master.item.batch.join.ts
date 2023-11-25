import { raw } from '@nestjs/mongoose'

export const MasterItemBatchJoin = raw({
  id: { type: String },
  code: { type: String },
  expired: { type: Date },
})
