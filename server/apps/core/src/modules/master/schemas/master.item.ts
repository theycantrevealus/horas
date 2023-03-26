import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { MasterItemBrand } from '@core/master/schemas/master.item.brand'
import { MasterItemCategory } from '@core/master/schemas/master.item.category'
import { MasterItemUnit } from '@core/master/schemas/master.item.unit'
import { Prop, raw, Schema } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { Type } from 'class-transformer'
import { SchemaTypes } from 'mongoose'

@Schema({ collection: 'master_item' })
export class MasterItem {
  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: [MasterItemCategory] })
  @Type(() => MasterItemCategory)
  category: MasterItemCategory[]

  @Prop({ type: MasterItemUnit })
  @Type(() => MasterItemUnit)
  unit: MasterItemUnit

  @Prop({ type: MasterItemBrand })
  @Type(() => MasterItemBrand)
  brand: MasterItemBrand

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}
