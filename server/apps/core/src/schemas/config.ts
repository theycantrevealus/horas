import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type ConfigDocument = HydratedDocument<Config>
@Schema({ collection: 'core_config' })
export class Config {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true })
  name: string

  @Prop({ type: SchemaTypes.Mixed })
  setter: any

  @Prop({ type: SchemaTypes.String })
  remark: string
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
