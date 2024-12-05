import { raw } from '@nestjs/mongoose'

export const QueueJoin = raw({
  id: { type: String },
  code: { type: String },
  queue_number: { type: Number },
})
