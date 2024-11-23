import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export const MasterItemSupplierJoin = raw({
  id: { type: String, example: `supplier-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'SUP00001' },
  name: { type: String, example: faker.company.name() },
})

export type MasterItemSupplierDocument = HydratedDocument<MasterItemSupplier>

@Schema({ collection: 'master_item_supplier' })
export class MasterItemSupplier {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string

  @Prop({ type: SchemaTypes.String })
  phone: string

  @Prop({ type: SchemaTypes.String })
  email: string

  @Prop({ type: SchemaTypes.String })
  sales_name: string

  @Prop({ type: SchemaTypes.String, required: false })
  address: string

  //{$text: { $search: 'Supplier Example', $caseSensitive: false, $diacriticSensitive: false}}

  @Prop({ type: SchemaTypes.String, required: false })
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

export const MasterItemSupplierSchema =
  SchemaFactory.createForClass(MasterItemSupplier)
