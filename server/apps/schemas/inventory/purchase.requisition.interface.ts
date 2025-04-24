import { IAccount } from '@gateway_core/account/interface/account.create_by'

export interface IPurchaseRequisition {
  id: string
  code: string
  transaction_date: Date
  created_by: IAccount
}
