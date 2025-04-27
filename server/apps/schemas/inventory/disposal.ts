import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ApprovalHistory, IApprovalHistory } from '@schemas/approval.history'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { StockDisposalDetail } from './disposal.detail'
import { IStockDisposalDetail } from './disposal.detail.interface'

export type StockDisposalDocument = HydratedDocument<StockDisposal>

/**
 * @class StockDiposal
 * @description Stock disposal refers to the process of permanently removing or eliminating inventory or stock from a warehouse, store, or other storage facility.
 */
@Schema({ collection: 'inventory_stock_disposal' })
export class StockDisposal {
  /**
   * Unique identifier for the stock audit.
   * @type { string }
   */
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  /**
   * @type { ILocale }
   * @description Stock audit locale
   */
  @Prop(LocaleJoin)
  locale: ILocale

  /**
   * @type { string }
   * @description Audit code (it will generated if not defined)
   */
  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  code: string

  /**
   * @type { Date }
   * @description Actual start of the audit
   */
  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  transaction_date: Date

  /**
   * @type { IMasterStockPoint }
   * @description Affected stock point
   */
  @Prop(MasterStockPointJoin)
  stock_point: IMasterStockPoint

  /**
   * @type { IStockAuditDetail[] }
   * @description Audit detail. Contains batch list and stock information
   */
  @Prop({
    type: [StockDisposalDetail],
    _id: false,
  })
  detail: IStockDisposalDetail[]

  /**
   * @type { string }
   * @enum {'new' | 'need_approval' | 'approved' | 'declined' | 'running' | 'completed'}
   * @description Status of the audit. Possible values:
   * - 'new': User creates a new audit
   * - 'need_approval': Department supervisor must approve to continue
   * - 'approved': Approved by department supervisor to execute
   * - 'declined': Requisition declined by department supervisor
   * - 'completed': Audit is completed
   * @default 'new'
   */
  @Prop({
    type: SchemaTypes.String,
    enum: ['new', 'need_approval', 'approved', 'declined', 'completed'],
    default: 'new',
  })
  status: string

  /**
   * @type { IApprovalHistory[] }
   * @description History of document approval procedure
   */
  @Prop({ type: [ApprovalHistory], _id: false })
  approval_history: IApprovalHistory[]

  /**
   * @type { any }
   * @description Additional field for extra data
   */
  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  /**
   * @type { string }
   * @description Audit remark
   */
  @Prop({ type: SchemaTypes.String })
  remark: string

  /**
   * @type { IAccount }
   * @description Account who create the audit
   */
  @Prop(AccountJoin)
  created_by: IAccount

  /**
   * @type { Date }
   * @description System record of created time
   */
  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  /**
   * @type { Date }
   * @description System record of last update time
   */
  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  /**
   * @type { Date }
   * @description System record of deleted time (soft-delete)
   */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const StockDisposalSchema = SchemaFactory.createForClass(StockDisposal)
