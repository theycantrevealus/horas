import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { GlobalResponse } from '@utility/dto/response'

export class ProceedDataTrafficDTO {
  sender: IAccountCreatedBy
  receiver: IAccountCreatedBy
  payload: GlobalResponse
}
