import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { IMasterItem } from '@gateway_core/master/interface/master.item'
import { IMasterItemBatch } from '@gateway_core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterItemJoin } from '@schemas/master/master.item'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type InventoryStockLogDocument = HydratedDocument<InventoryStockLog>

@Schema({ collection: 'inventory_stock_log' })
export class InventoryStockLog {
  @Prop(MasterItemJoin)
  item: IMasterItem

  @Prop(MasterItemBatchJoin)
  batch: IMasterItemBatch

  @Prop(MasterStockPointJoin)
  from: IMasterStockPoint

  @Prop(MasterStockPointJoin)
  to: IMasterStockPoint;

  @Prop({ type: SchemaTypes.Number })
  in: number

  @Prop({ type: SchemaTypes.Number })
  out: number

  @Prop({ type: SchemaTypes.Number })
  balance_from: number

  @Prop({ type: SchemaTypes.Number })
  balance_to: number

  @Prop({ type: SchemaTypes.String })
  transaction_id: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  logged_at: Date
}

export const InventoryStockLogSchema =
  SchemaFactory.createForClass(InventoryStockLog)
