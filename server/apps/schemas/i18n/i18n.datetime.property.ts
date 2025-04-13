import { raw } from '@nestjs/mongoose'

export const i18nDatetimeProperty = raw({
  weekday: { type: String, enum: ['narrow', 'short', 'long'] },
  era: { type: String, enum: ['narrow', 'short', 'long'] },
  year: { type: String, enum: ['2-digit', 'numeric'] },
  month: {
    type: String,
    enum: ['2-digit', 'numeric', 'narrow', 'short', 'long'],
  },
  day: { type: String, enum: ['2-digit', 'numeric'] },
  hour: { type: String, enum: ['2-digit', 'numeric'] },
  minute: { type: String, enum: ['2-digit', 'numeric'] },
  second: { type: String, enum: ['2-digit', 'numeric'] },
  timezone_name: { type: String, enum: ['short', 'long'] },
})
