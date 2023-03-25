import { raw } from '@nestjs/mongoose'

export const AccountJoin = raw({
  id: { type: String },
  email: { type: String },
  first_name: { type: String },
  last_name: { type: String },
})
