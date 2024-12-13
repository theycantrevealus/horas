import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { raw } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
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
  account: IAccount
  loggedAt: Date
  oldValue: any
  newValue: any
  version: number
}

export class DocumentHistory {}
