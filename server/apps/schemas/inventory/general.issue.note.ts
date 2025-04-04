import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { SchemaTypes } from 'mongoose'

import { IMaterialRequisition } from './material.requisition.interface'
import { MaterialRequisitionJoin } from './material.requisition.join'

@Schema({
  collection: 'inventory_general_issue_note',
})
export class GeneralIssueNote {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop(LocaleJoin)
  locale: ILocale

  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  code: string

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  transaction_date: Date

  @Prop(MaterialRequisitionJoin)
  material_requisition: IMaterialRequisition

  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccount

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
