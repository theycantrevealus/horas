import { IAccount } from '@gateway_core/account/interface/account.create_by'

export class ProceedDataTrafficDTO {
  sender: IAccount
  receiver: IAccount | null
  // payload: GlobalResponse
  payload: object
}
