import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ILOV } from '@schemas/lov/lov.interface'
import { LOVJoin } from '@schemas/lov/lov.join'
import { IMasterItemCategory } from '@schemas/master/master.item.category.interface'
import { MasterItemCategoryJoin } from '@schemas/master/master.item.category.join'
import { MasterItemConfiguration } from '@schemas/master/master.item.configuration'
import { IMasterItemConfiguration } from '@schemas/master/master.item.configuration.interface'
import {
  MasterItemStructureCoordinatorSchema,
  registerMasterItemStructureSchemaDiscriminator,
} from '@schemas/master/master.item.structure.coordinator'
import { IMasterItemUnit } from '@schemas/master/master.item.unit.interface'
import { MasterItemUnitJoin } from '@schemas/master/master.item.unit.join'
import {
  HydratedDocument,
  Schema as MongooseSchema,
  SchemaTypes,
} from 'mongoose'

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
    type: [MasterItemUnitJoin],
    _id: false,
  })
  unit: IMasterItemUnit[]

  // @Prop({
  //   unique: false,
  //   type: MasterItemBrandJoin,
  //   _id: false,
  // })
  // brand: IMasterItemBrand

  @Prop({ type: MasterItemStructureCoordinatorSchema, required: false })
  structure?: unknown

  @Prop({
    unique: false,
    required: false,
    type: [LOVJoin],
    _id: false,
  })
  properties: ILOV[]

  // @Prop({
  //   unique: false,
  //   required: false,
  //   type: [MasterItemStoring],
  //   _id: false,
  // })
  // storing: IMasterItemStoring[]

  @Prop({ type: SchemaTypes.String })
  remark: string

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

export const MasterItemSchema = SchemaFactory.createForClass(MasterItem)

registerMasterItemStructureSchemaDiscriminator(
  MasterItemSchema.path('structure') as MongooseSchema.Types.Subdocument
)

// export const MasterItemSchema = initDiscriminators(MasterItem, 'type', [
//   { name: 'B1', schema: SchemaFactory.createForClass(MasterDrugIngredient) },
//   { name: 'B2', schema: SchemaFactory.createForClass(MasterOtherProperty) },
// ])
