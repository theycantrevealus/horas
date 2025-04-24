import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { Types } from 'mongoose'

export const PurchaseRequisitionJoin = raw({
  id: { type: String, example: `item-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'ABC00123' },
  transaction_date: { type: Date },
  created_by: { type: AccountJoin },
})
