import { raw } from '@nestjs/mongoose'

import { i18nDatetimeProperty } from './i18n.datetime.property'

export const i18nDatetime = raw({
  short: { type: i18nDatetimeProperty, _id: false },
  long: { type: i18nDatetimeProperty, _id: false },
})
