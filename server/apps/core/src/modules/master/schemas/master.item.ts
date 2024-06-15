import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { IMasterItemBrand } from '@core/master/interface/master.item.brand'
import { IMasterItemCategory } from '@core/master/interface/master.item.category'
import { IMasterItemConfiguration } from '@core/master/interface/master.item.configuration'
import { IMasterItemStoring } from '@core/master/interface/master.item.storing'
import { IMasterItemUnit } from '@core/master/interface/master.item.unit'
import { MasterItemBrandJoin } from '@core/master/schemas/master.item.brand.join'
import { MasterItemCategoryJoin } from '@core/master/schemas/master.item.category.join'
import { MasterItemConfiguration } from '@core/master/schemas/master.item.configuration'
import { MasterItemStoring } from '@core/master/schemas/master.item.storing'
import { MasterItemUnitJoin } from '@core/master/schemas/master.item.unit.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
import { ILOV, LOVJoin } from '@schemas/lov/lov.join'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterItemDocument = HydratedDocument<MasterItem>
@Schema({ collection: 'master_item' })
export class MasterItem {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String })
  name: string

  @Prop({ type: SchemaTypes.String, required: false })
  alias: string

  @Prop(MasterItemConfiguration)
  configuration: IMasterItemConfiguration

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

  @Prop({
    unique: false,
    required: false,
    type: [LOVJoin],
    _id: false,
  })
  properties: ILOV[]

  @Prop({
    unique: false,
    required: false,
    type: [MasterItemStoring],
    _id: false,
  })
  storing: IMasterItemStoring[]

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

export const MasterItemSchema = SchemaFactory.createForClass(MasterItem)
