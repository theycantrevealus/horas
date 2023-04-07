import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  IMasterItemBrand,
  MasterItemBrandJoin,
} from '@core/master/schemas/master.item.brand.join'
import {
  IMasterItemCategory,
  MasterItemCategoryJoin,
} from '@core/master/schemas/master.item.category.join'
import {
  IMasterItemUnit,
  MasterItemUnitJoin,
} from '@core/master/schemas/master.item.unit.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterItemDocument = HydratedDocument<MasterItem>
@Schema({ collection: 'master_item' })
export class MasterItem {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({
    unique: false,
    type: [MasterItemCategoryJoin],
    _id: false,
  })
  category: IMasterItemCategory[]

  @Prop({
    unique: false,
    type: MasterItemUnitJoin,
    _id: false,
  })
  unit: IMasterItemUnit

  @Prop({
    unique: false,
    type: MasterItemBrandJoin,
    _id: false,
  })
  brand: IMasterItemBrand

  @Prop({ type: SchemaTypes.String })
  remark: string

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

export const MasterItemSchema = SchemaFactory.createForClass(MasterItem)
