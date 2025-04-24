import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ApprovalHistory, IApprovalHistory } from '@schemas/approval.history'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { StockAdjustmentDetail } from './adjustment.detail'
import { IStockAdjustmentDetail } from './adjustment.detail.interface'

export type StockAdjustmentDocument = HydratedDocument<StockAdjustment>

/**
 * @class StockAdjustment
 * @description Stock adjustment model. Stock adjustment process and history will recorded here.
 * Stock adjustment refers to the process of updating inventory records to reflect changes in stock levels due to various reasons such as:
 * - Inventory discrepancies
 * - Stockroom errors
 * - Damaged or spoiled goods
 * - Returns or exchanges
 * - Theft or loss
 * - Inventory audits
 */
@Schema({ collection: 'inventory_stock_adjustment' })
export class StockAdjustment {
  /**
   * Unique identifier
   * @type { string }
   */
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  /**
   * @type { ILocale }
   * @description Stock adjustment locale
   */
  @Prop(LocaleJoin)
  locale: ILocale

  /**
   * @type { string }
   * @description Adjustment code (it will generated if not defined)
   */
  @Prop({
    type: SchemaTypes.String,
    required: true,
    unique: true,
  })
  code: string

  /**
   * @type { IMasterStockPoint }
   * @description Affected stock point
   */
  @Prop(MasterStockPointJoin)
  stock_point: IMasterStockPoint

  /**
   * @type { IStockAuditDetail }
   * @description Adjustment detail. Contains batch list and stock information
   */
  @Prop({
    type: [StockAdjustmentDetail],
    _id: false,
  })
  detail: IStockAdjustmentDetail[]

  /**
   * @type { any }
   * @description Additional field for extra data
   */
  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  /**
   * @type { string }
   * @enum {'new' | 'need_approval' | 'approved' | 'declined' | 'running' | 'completed'}
   * @description Status of the adjustment. Possible values:
   * - 'new': User creates a new adjustment proposal
   * - 'need_approval': Department supervisor must approve to continue
   * - 'approved': Approved by department supervisor to execute
   * - 'declined': Requisition declined by department supervisor
   * - 'running': Adjustment is running. (Automatic update by system)
   * - 'completed': Adjustment completed. (Automatic update by system)
   * @default 'new'
   */
  @Prop({
    type: SchemaTypes.String,
    enum: [
      'new',
      'need_approval',
      'approved',
      'declined',
      'running',
      'completed',
    ],
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
   * @type { string }
   * @description Adjustment remark
   */
  @Prop({ type: SchemaTypes.String })
  remark: string

  /**
   * @type { IAccount }
   * @description Account who create the adjustment
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

export const StockAdjustmentSchema =
  SchemaFactory.createForClass(StockAdjustment)
