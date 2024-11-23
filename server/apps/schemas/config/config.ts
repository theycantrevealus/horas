import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { HydratedDocument, SchemaTypes } from 'mongoose'

import { ConfigGroupJoin } from './config.group'

export type ConfigDocument = HydratedDocument<Config>
@Schema({ collection: 'core_config' })
export class Config {
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
    type: ConfigGroupJoin,
    _id: false,
    required: false,
  })
  group: string

  @Prop({ type: SchemaTypes.Mixed })
  setter: any

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccount
}
export const ConfigSchema = SchemaFactory.createForClass(Config)

export interface IConfig {
  name: string
  setter: any
  remark: string
  __v: number
}

export const ConfigJoin = raw({
  id: { type: SchemaTypes.String },
  name: { type: SchemaTypes.String },
  setter: { type: SchemaTypes.Mixed },
})
