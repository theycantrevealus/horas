import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterStockPointConfiguration } from '@schemas/master/master.stock.point.configuration'
import { IMasterStockPointConfiguration } from '@schemas/master/master.stock.point.configuration.interface'
import { IMetaData, MetaData } from '@schemas/meta'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MasterStockPointJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export type MasterStockPointDocument = HydratedDocument<MasterStockPoint>

@Schema({ collection: 'master_stock_point' })
export class MasterStockPoint {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

  @Prop(MasterStockPointConfiguration)
  configuration: IMasterStockPointConfiguration

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    unique: false,
    type: MetaData,
    _id: false,
  })
  meta: IMetaData

  @Prop(AccountJoin)
  created_by: IAccount

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const MasterStockPointSchema =
  SchemaFactory.createForClass(MasterStockPoint)
