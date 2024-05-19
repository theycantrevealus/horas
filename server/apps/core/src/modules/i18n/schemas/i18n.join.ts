import { raw } from '@nestjs/mongoose'

export const CurrencyJoin = raw({
  language_code: { type: String },
  iso_2_digits: { type: String },
  currency: { type: String },
  timezone: { type: String },
})
