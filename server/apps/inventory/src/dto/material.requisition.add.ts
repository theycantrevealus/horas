import { Prop } from '@nestjs/mongoose'
import { Account, AccountJoin } from '@schemas/account/account.model'
import { SchemaTypes } from 'mongoose'

import { MaterialRequisitionItemDTO } from './material.requisition.item'

export class MaterialRequisitionAddDTO {
  code: string

  @Prop({ type: [MaterialRequisitionItemDTO] })
  items: MaterialRequisitionItemDTO[]

  @Prop(AccountJoin)
  created_by: Account

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}
