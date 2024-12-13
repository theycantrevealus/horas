import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { IMasterItemBatch } from '@schemas/master/master.item.batch.interface'
import { MasterItemBatchJoin } from '@schemas/master/master.item.batch.join'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { MasterItemJoin } from '@schemas/master/master.item.join'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
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
