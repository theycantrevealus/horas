import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { AccountJoin } from '@schemas/account/account.raw'
import { IsNotEmpty, IsString } from 'class-validator'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type LOVDocument = HydratedDocument<LOV>
@Schema({ collection: 'lov' })
export class LOV {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string

  @Prop({
    type: SchemaTypes.String,
    unique: false,
    required: true,
    default: '',
  })
  group: string

  @Prop({ type: SchemaTypes.String })
  parent: string

  @Prop({ type: SchemaTypes.String })
  value: string

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

export const LOVSchema = SchemaFactory.createForClass(LOV)

export const LOVJoin = raw({
  id: { type: String },
  name: { type: String },
  value: { type: String },
})

export interface ILOV {
  id: string
  name: string
  value: string
}

export class CLOV {
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
  name: string

  @ApiProperty({
    type: String,
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  value: string
}
