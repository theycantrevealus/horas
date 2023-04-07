import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { TimeManagement } from '@utility/time'
import { IsBoolean, IsNotEmpty } from 'class-validator'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MasterStockPointConfiguration = raw({
  allow_grn: { type: Boolean, default: false },
  allow_incoming: { type: Boolean, default: false },
  allow_outgoing: { type: Boolean, default: false },
  allow_destruction: { type: Boolean, default: false },
})

export interface IMasterStockPointConfiguration {
  allow_grn: boolean
  allow_incoming: boolean
  allow_outgoing: boolean
  allow_destruction: boolean
}

export class CMasterStockPointConfiguration {
  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_grn: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_incoming: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_outgoing: boolean

  @ApiProperty({
    example: true,
    type: Boolean,
    description: '',
  })
  @IsNotEmpty()
  @IsBoolean()
  allow_destruction: boolean
}

export type MasterStockPointDocument = HydratedDocument<MasterStockPoint>
@Schema({ collection: 'master_stock_point' })
export class MasterStockPoint {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

  @Prop(raw(MasterStockPointConfiguration))
  configuration: IMasterStockPointConfiguration

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

export const MasterStockPointSchema =
  SchemaFactory.createForClass(MasterStockPoint)
