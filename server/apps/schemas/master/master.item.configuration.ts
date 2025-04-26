import { raw } from '@nestjs/mongoose'

export const MasterItemConfiguration = raw({
  allow_grn: { type: Boolean, default: false },
  allow_incoming: { type: Boolean, default: false },
  allow_outgoing: { type: Boolean, default: false },
  allow_destruction: { type: Boolean, default: false },
  benefit_margin_type: { type: String, default: false },
  benefit_margin_value: { type: Number, default: false },
})
