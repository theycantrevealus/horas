import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { GlobalResponse } from '@utility/dto/response'

export class ProceedDataTrafficDTO {
  sender: IAccount
  receiver: IAccount | null
  payload: GlobalResponse
}
