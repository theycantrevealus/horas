import { raw } from '@nestjs/mongoose'
import { Types } from 'mongoose'

export const AccountJoin = raw({
  _id: { type: Types.ObjectId },
  email: { type: String },
  first_name: { type: String },
  last_name: { type: String },
})
