import { raw } from '@nestjs/mongoose'

export const i18nNumberCurrency = raw({
  style: { type: String, default: 'currency' },
  currency: { type: String, default: '' },
  notation: { type: String, default: 'standard' },
})

export const i18nNumberDecimal = raw({
  style: { type: String, default: 'decimal' },
  maximumFractionDigits: { type: Number, default: 2 },
  minimumFractionDigits: { type: Number, default: 2 },
})

export const i18nNumberPercent = raw({
  style: { type: String, default: 'percent' },
  useGrouping: { type: Boolean, default: false },
})

export const i18nNumber = raw({
  currency: { type: i18nNumberCurrency, _id: false },
  decimal: { type: i18nNumberDecimal, _id: false },
  percent: { type: i18nNumberPercent, _id: false },
})
