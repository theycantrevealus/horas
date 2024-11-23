import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MasterItemUnitJoin = raw({
  id: { type: String },
  code: { type: String },
  name: { type: String },
})

export type MasterItemUnitDocument = HydratedDocument<MasterItemUnit>

@Schema({ collection: 'master_item_unit' })
export class MasterItemUnit {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

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

export const MasterItemUnitSchema = SchemaFactory.createForClass(MasterItemUnit)
