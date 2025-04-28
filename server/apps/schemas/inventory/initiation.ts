import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ApprovalHistory, IApprovalHistory } from '@schemas/approval.history'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { StockInitiationDetail } from './initiation.detail'
import { IStockInitiationDetail } from './initiation.detail.interface'

export type StockInitiationDocument = HydratedDocument<StockInitiation>

/**
 * @class StockInitiation
 * @description Stock initiation or stock initialization refers to the process of setting up or initializing inventory levels for a new product, warehouse, or location.
 */
@Schema({ collection: 'inventory_stock_initiation' })
export class StockInitiation {
  /**
   * Unique identifier.
   * @type { string }
   */
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  /**
   * @type { ILocale }
   * @description Locale
   */
  @Prop(LocaleJoin)
  locale: ILocale

  /**
   * @type { string }
   * @description Code (it will generated if not defined)
   */
  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  code: string

  /**
   * @type { Date }
   * @description Actual start of the transaction
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
   * @description Initiation detail. Contains batch list and stock information
   */
  @Prop({
    type: [StockInitiationDetail],
    _id: false,
  })
  detail: IStockInitiationDetail[]

  /**
   * @type { string }
   * @enum {'new' | 'need_approval' | 'approved' | 'declined' | 'running' | 'completed'}
   * @description Status of the document. Possible values:
   * - 'new': User creates a new document
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
   * @description Remark
   */
  @Prop({ type: SchemaTypes.String })
  remark: string

  /**
   * @type { IAccount }
   * @description Account who create the document
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

export const StockInitiationSchema =
  SchemaFactory.createForClass(StockInitiation)
