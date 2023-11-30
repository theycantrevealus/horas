import { IAccountCreatedBy } from '@core/account/interface/account.create_by'

export class ConsumerGeneralDataDTO {
  action: string
  id: string
  token: string
  account: IAccountCreatedBy
}
