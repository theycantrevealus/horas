import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CMasterItem } from '@gateway_core/master/dto/master.item'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AccountJoin } from '@schemas/account/account.raw'
import { IMasterItem } from '@schemas/master/master.item.interface'
import { MasterItemJoin } from '@schemas/master/master.item.join'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export class CMasterItemBatch {
  @ApiProperty({
    type: String,
    example: `item_batch-${new Types.ObjectId().toString()}`,
  })
  id: string

  @ApiProperty({
    type: String,
    example: 'XX-XX',
  })
  code: string

  @ApiProperty({
    type: CMasterItem,
  })
  item: IMasterItem

  @ApiProperty({
    type: Number,
    description:
      'Value will set from purchase order price after approval and received via GRN flow',
    example: 0,
  })
  price_buy: number

  @ApiProperty({
    type: Number,
    description:
      'Used for selling price or calculate stock point costs or revenue depends on system configuration',
    example: 0,
  })
  price_sell: number

  @ApiProperty({
    type: Date,
    example: 'Drugs',
  })
  expired: Date
}

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
    type: SchemaTypes.Number,
  })
  price_buy: number

  @Prop({
    type: SchemaTypes.Number,
  })
  price_sell: number

  @Prop({
    type: SchemaTypes.Date,
    default: null,
    required: false,
  })
  expired: Date

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccount

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
