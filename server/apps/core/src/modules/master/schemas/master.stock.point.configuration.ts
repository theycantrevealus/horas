import { raw } from '@nestjs/mongoose'

export const MasterStockPointConfiguration = raw({
  allow_grn: { type: Boolean, default: false },
  allow_incoming: { type: Boolean, default: false },
  allow_outgoing: { type: Boolean, default: false },
  allow_destruction: { type: Boolean, default: false },
})
