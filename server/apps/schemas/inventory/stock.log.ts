import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type InventoryStockLogDocument = HydratedDocument<InventoryStockLog>

@Schema({ collection: 'inventory_stock_log' })
export class InventoryStockLog {
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
  balance: number

  @Prop({ type: SchemaTypes.String })
  transaction_id: string

  @Prop(AccountJoin)
  created_by: IAccount

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  logged_at: Date
}

export const InventoryStockLogSchema =
  SchemaFactory.createForClass(InventoryStockLog)
