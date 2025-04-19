import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ApprovalHistory, IApprovalHistory } from '@schemas/approval.history'
import { ILocale, LocaleJoin } from '@schemas/locale'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { StockAuditDetail } from './audit.detail'
import { IStockAuditDetail } from './audit.detail.interface'

export type StockAuditDocument = HydratedDocument<StockAudit>

/**
 * @class StockAudit
 * @description Stock audit model. Audit process and history will recorded here.
 * Stock audit refers to the physical verification of a company's stock based on maintained records.
 * It's a process that involves verifying and detecting discrepancies, finding deviations, and reporting accordingly.
 * This audit can be carried out by an internal auditor or an external vendor.
 */
@Schema({ collection: 'inventory_stock_audit' })
export class StockAudit {
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
   * @type { Date }
   * @description Period when the audit will held
   */
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  period_from: Date

  /**
   * @type { Date }
   * @description Period when the audit will completed
   */
  @Prop({
    type: SchemaTypes.Date,
    required: true,
  })
  period_to: Date

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
   * @type { IStockAuditDetail }
   * @description Audit detail. Contains batch list and stock information
   */
  @Prop({
    type: [StockAuditDetail],
    _id: false,
  })
  detail: IStockAuditDetail[]

  /**
   * @type { any }
   * @description Additional field for extra data
   */
  @Prop({ type: SchemaTypes.Mixed, required: false })
  extras: any

  /**
   * @type { string }
   * @enum {'new' | 'need_approval' | 'approved' | 'declined' | 'running' | 'completed'}
   * @description Status of the audit. Possible values:
   * - 'new': User creates a new audit
   * - 'need_approval': Department supervisor must approve to continue
   * - 'approved': Approved by department supervisor to execute
   * - 'declined': Requisition declined by department supervisor
   * - 'running': Audit is running
   * - 'completed': Audit is completed
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

export const StockAuditSchema = SchemaFactory.createForClass(StockAudit)
