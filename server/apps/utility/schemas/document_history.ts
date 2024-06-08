import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { raw } from '@nestjs/mongoose'

export const DocumentHistoryJoin = raw({
  account: { type: raw(AccountJoin) },
  loggedAt: { type: Date },
  oldValue: { type: String },
  newValue: { type: String },
  version: { type: Number },
})

export interface IDocumentHistory {
  account: IAccountCreatedBy
  loggedAt: Date
  oldValue: string
  newValue: string
  version: number
}

export class DocumentHistory {}
