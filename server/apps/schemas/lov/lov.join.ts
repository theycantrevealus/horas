import { raw } from '@nestjs/mongoose'

export const LOVJoin = raw({
  id: { type: String },
  name: { type: String },
  value: { type: String },
})
