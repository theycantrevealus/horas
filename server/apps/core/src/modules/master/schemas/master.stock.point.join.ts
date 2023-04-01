import { raw } from '@nestjs/mongoose'

export const MasterStockPointJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export interface IMasterStockPoint {
  id: string
  code: string
  name: string
}
