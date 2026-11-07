import { raw } from '@nestjs/mongoose'

export const RawAccount = raw({
  user_id: { type: String },
  user_name: { type: String },
  first_name: { type: String },
  last_name: { type: String },
})
