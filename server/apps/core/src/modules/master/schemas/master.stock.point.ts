import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { IMasterStockPointConfiguration } from '@core/master/interface/master.stock.point.configuration'
import { MasterStockPointConfiguration } from '@core/master/schemas/master.stock.point.configuration'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

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
