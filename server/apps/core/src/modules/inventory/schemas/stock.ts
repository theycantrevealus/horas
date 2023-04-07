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
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type InventoryStockDocument = HydratedDocument<InventoryStock>
@Schema({ collection: 'inventory_stock' })
export class InventoryStock {
  @Prop(raw(MasterItemJoin))
  item: IMasterItem

  @Prop(raw(MasterItemBatchJoin))
  batch: IMasterItemBatch

  @Prop(raw(MasterStockPointJoin))
  stock_point: IMasterStockPoint

  @Prop({ type: SchemaTypes.Number })
  qty: number
}
export const InventoryStockSchema = SchemaFactory.createForClass(InventoryStock)
