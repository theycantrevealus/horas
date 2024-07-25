import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { IMasterItem } from '@core/master/interface/master.item'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterItemJoin } from '@schemas/master/master.item'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MasterItemBatchJoin = raw({
  id: { type: String },
  code: { type: String },
  expired: { type: Date },
})

export type MasterItemBatchDocument = HydratedDocument<MasterItemBatch>

@Schema({ collection: 'master_item_batch' })
export class MasterItemBatch {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true })
  code: string

  @Prop(MasterItemJoin)
  item: IMasterItem

  @Prop({
    type: SchemaTypes.Date,
    default: null,
    required: false,
  })
  expired: Date

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

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

export const MasterItemBatchSchema =
  SchemaFactory.createForClass(MasterItemBatch)
