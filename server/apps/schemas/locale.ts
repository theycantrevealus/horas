import { raw } from '@nestjs/mongoose'

export const LocaleJoin = raw({
  language_code: { type: String },
  iso_2_digits: { type: String },
  currency: { type: String },
  timezone: { type: String },
})

export interface ILocale {
  language_code: string
  iso_2_digits: string
  currency: string
  timezone: string
}
