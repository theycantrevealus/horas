import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { IMasterItem } from '@core/master/interface/master.item'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AccountJoin } from '@schemas/account/account.raw'
import { MasterItemJoin } from '@schemas/master/master.item'
import { IsNotEmpty, IsString } from 'class-validator'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export class CMasterPartner {
  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  id: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  code: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  name: string
}

export interface IMasterPartner {
  id: string
  code: string
  name: string
}

export type MasterPartnerDocument = HydratedDocument<MasterPartner>

@Schema({ collection: 'master_partner' })
export class MasterPartner {
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

export const MasterPartnerJoin = raw({
  id: { type: String, example: `item-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'PAR00001' },
  name: { type: String, example: 'Another Laboratorium Partner' },
})

export const MasterPartnerSchema = SchemaFactory.createForClass(MasterPartner)
