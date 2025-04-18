import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ApprovalHistory, IApprovalHistory } from '@schemas/approval.history'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { MutationDetail } from './mutation.detail'
import { IMutationDetail } from './mutation.detail.interface'

export type MutationDocument = HydratedDocument<Mutation>

@Schema({ collection: 'inventory_material_requisition' })
export class Mutation {
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

  @Prop(MasterStockPointJoin)
  from: IMasterStockPoint

  @Prop(MasterStockPointJoin)
  to: IMasterStockPoint

  @Prop({
    type: [MutationDetail],
    _id: false,
  })
  detail: IMutationDetail[]

  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  @Prop({
    type: SchemaTypes.String,
    enum: [
      'new',
      'need_approval',
      'approved',
      'declined',
      'processed',
      'completed',
      'purchase_requisition',
      'cancelled',
    ],
    /*
     * New                      : User create new requisition
     * Need Approval            : Department supervisor must approve to continue
     * Declined                 : Requisition declined by department supervisor
     * Approved                 : Approved by department supervisor to execute
     * Completed                : Stock moved
     * Cancelled                : Mutation canceled
     */
    default: 'new',
  })
  status: string

  @Prop({ type: [ApprovalHistory], _id: false })
  approval_history: IApprovalHistory[]

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

export const MutationSchema = SchemaFactory.createForClass(Mutation)
