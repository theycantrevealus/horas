import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { IMasterStockPointConfiguration } from '@gateway_core/master/interface/master.stock.point.configuration'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterStockPointConfiguration } from '@schemas/master/master.stock.point.configuration'
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

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

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
