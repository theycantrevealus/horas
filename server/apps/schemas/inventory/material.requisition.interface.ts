import { IAccount } from '@gateway_core/account/interface/account.create_by'

export interface IMaterialRequisition {
  id: string
  code: string
  transaction_date: Date
  created_by: IAccount
}

export interface IMaterialRequisitionApproval {
  status: string
  logged_at: Date
  remark: string
  created_by: IAccount
}
