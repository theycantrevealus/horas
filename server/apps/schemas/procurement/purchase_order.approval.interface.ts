import { IAccount } from '@gateway_core/account/interface/account.create_by'

export interface IPurchaseOrderApproval {
  status: string
  logged_at: Date
  remark: string
  created_by: IAccount
}
