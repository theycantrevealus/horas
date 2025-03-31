import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { Types } from 'mongoose'

export const MaterialRequisitionJoin = raw({
  id: {
    type: String,
    example: `material_requisition-${new Types.ObjectId().toString()}`,
  },
  code: { type: String, example: 'MR00001' },
  transaction_date: { type: Date },
  created_by: { type: AccountJoin },
})
