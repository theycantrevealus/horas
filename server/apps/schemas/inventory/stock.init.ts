import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { IMasterItem } from '@gateway_core/master/interface/master.item'
import { IMasterStockPoint } from '@gateway_core/master/interface/master.stock.point'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterItemJoin } from '@schemas/master/master.item'
import { MasterStockPointJoin } from '@schemas/master/master.stock.point'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const InventoryStockInitDetail = raw({
  item: { type: MasterItemJoin, _id: false },
  qty: { type: Number, example: 10 },
  batch: { type: String, example: 'XXXX' },
  remark: { type: String, example: 'Another remark for an item' },
})

export interface IInventoryStockInitDetail {
  item: IMasterItem
  qty: number
  batch: string
  remark: string
}

export type InventoryStockInitDocument = HydratedDocument<InventoryStockInit>

@Schema({ collection: 'inventory_stock_init' })
export class InventoryStockInit {
  @Prop(MasterStockPointJoin)
  stock_point: IMasterStockPoint

  @Prop({ type: SchemaTypes.String, required: true })
  transaction_id: string

  @Prop({
    enum: ['manual', 'import'],
    default: 'manual',
    required: true,
    type: SchemaTypes.String,
  })
  source: string

  @Prop({
    type: [InventoryStockInitDetail],
    _id: false,
  })
  item: IInventoryStockInitDetail

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.String,
    default: () => 'Asia/Jakarta',
    required: true,
  })
  timezone: string

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const InventoryStockInitSchema =
  SchemaFactory.createForClass(InventoryStockInit)
