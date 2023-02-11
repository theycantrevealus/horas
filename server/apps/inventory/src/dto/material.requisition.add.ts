import { AccountJoin } from '@core/account/schemas/account.join'
import { AccountModel } from '@core/account/schemas/account.model'
import { Prop, raw } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { SchemaTypes } from 'mongoose'

import { MaterialRequisitionItemDTO } from './material.requisition.item'

export class MaterialRequisitionAddDTO {
  code: string

  @Prop({ type: [MaterialRequisitionItemDTO] })
  items: MaterialRequisitionItemDTO[]

  @Prop(raw(AccountJoin))
  created_by: AccountModel

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}
