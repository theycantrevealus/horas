import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export interface IConfigGroup {
  id: string
  name: string
  __v: number
}

export class CConfigGroup {
  @ApiProperty({
    type: String,
    example: '',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  id: string

  @ApiProperty({
    type: String,
    example: '',
    description: '',
  })
  @IsNotEmpty()
  @IsString()
  name: string
}

export const ConfigGroupJoin = raw({
  id: { type: SchemaTypes.String },
  name: { type: SchemaTypes.String },
})

export type ConfigGroupDocument = HydratedDocument<ConfigGroup>
@Schema({ collection: 'core_config_group' })
export class ConfigGroup {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string

  @Prop({
    type: SchemaTypes.String,
    default: '',
    required: false,
  })
  label: string

  @Prop({
    type: SchemaTypes.String,
    default: '0',
    required: false,
  })
  level: string

  @Prop({
    type: SchemaTypes.String,
    default: 'pi-file',
    required: false,
  })
  icon: string

  @Prop({
    type: raw(ConfigGroupJoin),
    _id: false,
    required: false,
  })
  parent: IConfigGroup

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(raw(AccountJoin))
  created_by: IAccountCreatedBy
}
export const ConfigGroupSchema = SchemaFactory.createForClass(ConfigGroup)
