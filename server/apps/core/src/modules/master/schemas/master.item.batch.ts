import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { IMasterItem } from '@core/master/interface/master.item'
import { MasterItemJoin } from '@core/master/schemas/master.item.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

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
