import { AccountJoin } from '@core/account/schemas/account.join'
import { raw } from '@nestjs/mongoose'

export const PurchaseOrderApproval = raw({
  status: {
    type: String,
    enum: ['new', 'need_approval', 'approved', 'declined'],
    default: 'new',
  },
  logged_at: {
    type: Date,
    default: () => new Date(),
    required: true,
  },
  remark: { type: String },
  created_by: { type: raw(AccountJoin) },
})
