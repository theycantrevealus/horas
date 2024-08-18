import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterItemSupplierJoin } from '@schemas/master/master.item.supplier'
import { Types } from 'mongoose'

export const PurchaseOrderJoin = raw({
  id: {
    type: String,
    example: `purchase_order-${new Types.ObjectId().toString()}`,
  },
  code: { type: String, example: 'PO00001' },
  supplier: { type: MasterItemSupplierJoin },
  purchase_date: { type: Date },
  remark: { type: String },
  created_by: { type: AccountJoin },
})
