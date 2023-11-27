import { IMasterItem } from '@core/master/interface/master.item'
import { IMasterItemBatch } from '@core/master/interface/master.item.batch'
import { IMasterStockPoint } from '@core/master/interface/master.stock.point'
import { MasterItemBatchJoin } from '@core/master/schemas/master.item.batch.join'
import { MasterItemJoin } from '@core/master/schemas/master.item.join'
import { MasterStockPointJoin } from '@core/master/schemas/master.stock.point.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type InventoryStockDocument = HydratedDocument<InventoryStock>
@Schema({ collection: 'inventory_stock' })
export class InventoryStock {
  @Prop(MasterItemJoin)
  item: IMasterItem

  @Prop(MasterItemBatchJoin)
  batch: IMasterItemBatch

  @Prop(MasterStockPointJoin)
  stock_point: IMasterStockPoint

  @Prop({ type: SchemaTypes.Number })
  qty: number

  @Prop({ type: SchemaTypes.String })
  storing_label: string
}
export const InventoryStockSchema = SchemaFactory.createForClass(InventoryStock)
