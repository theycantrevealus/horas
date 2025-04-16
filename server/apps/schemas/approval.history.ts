import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { raw } from '@nestjs/mongoose'

import { AccountJoin } from './account/account.raw'

export interface IApprovalHistory {
  status: string
  logged_at: Date
  remark: string
  created_by: IAccount
}

export const ApprovalHistory = raw({
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
  created_by: { type: raw(AccountJoin), _id: false },
})
