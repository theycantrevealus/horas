import { IAccount } from '@gateway_core/account/interface/account.create_by'

// export class IPurchaseOrderApproval {
//   @Prop({
//     type: String,
//     enum: ['new', 'approved', 'declined'],
//     default: 'new',
//   })
//   status: string
//
//   @Prop({
//     type: SchemaTypes.Date,
//     default: () => new Date(),
//     required: true,
//   })
//   logged_at: Date
//
//   @Prop({ type: SchemaTypes.String })
//   remark: string
//
//   @Prop(AccountJoin)
//   created_by: IAccount
// }

export interface IPurchaseOrderApproval {
  status: string
  logged_at: Date
  remark: string
  created_by: IAccount
}
