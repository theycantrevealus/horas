import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
import { SchemaTypes } from 'mongoose'

// TODO : Implement this feature on database middleware
export const DocumentHistoryJoin = raw({
  account: { type: raw(AccountJoin) },
  loggedAt: { type: Date },
  oldValue: { type: SchemaTypes.Mixed },
  newValue: { type: SchemaTypes.Mixed },
  version: { type: Number },
})

export interface IDocumentHistory {
  account: IAccountCreatedBy
  loggedAt: Date
  oldValue: any
  newValue: any
  version: number
}

export class DocumentHistory {}
