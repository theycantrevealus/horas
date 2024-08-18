import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { GlobalResponse } from '@utility/dto/response'

export class ProceedDataTrafficDTO {
  sender: IAccountCreatedBy
  receiver: IAccountCreatedBy | null
  payload: GlobalResponse
}
