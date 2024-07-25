import { IMasterItem } from '@core/master/interface/master.item'
import { IMasterItemBatch } from '@core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@core/master/interface/master.stock.point'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
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
  stock_point: IMasterStockPoint;

  @Prop({ type: SchemaTypes.Number })
  in: number

  @Prop({ type: SchemaTypes.Number })
  out: number

  @Prop({ type: SchemaTypes.Number })
  balance: number

  @Prop({ type: SchemaTypes.String })
  transaction: string

  @Prop({ type: SchemaTypes.String })
  transaction_id: string

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  logged_at: Date
}

export const InventoryStockLogSchema =
  SchemaFactory.createForClass(InventoryStockLog)
