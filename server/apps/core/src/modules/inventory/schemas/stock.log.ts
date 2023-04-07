import {
  IMasterItemBatch,
  MasterItemBatchJoin,
} from '@core/master/schemas/master.item.batch.join'
import {
  IMasterItem,
  MasterItemJoin,
} from '@core/master/schemas/master.item.join'
import {
  IMasterStockPoint,
  MasterStockPointJoin,
} from '@core/master/schemas/master.stock.point.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type InventoryStockLogDocument = HydratedDocument<InventoryStockLog>
@Schema({ collection: 'inventory_stock_log' })
export class InventoryStockLog {
  @Prop(raw(MasterItemJoin))
  item: IMasterItem

  @Prop(raw(MasterItemBatchJoin))
  batch: IMasterItemBatch

  @Prop(raw(MasterStockPointJoin))
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
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  logged_at: Date
}
export const InventoryStockLogSchema =
  SchemaFactory.createForClass(InventoryStockLog)
