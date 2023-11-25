import { raw } from '@nestjs/mongoose'

export const MasterQueueJoin = raw({
  id: { type: String },
  code: { type: String },
})
