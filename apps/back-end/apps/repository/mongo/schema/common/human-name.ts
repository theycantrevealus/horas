import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of a `HumanName`.
 *
 * @property use - Purpose of the name.
 * @property text - Full name as printed.
 * @property family - Family name.
 * @property given - Given names.
 * @property prefix - Titles before the name.
 * @property suffix - Titles after the name.
 * @property script - ISO 15924 script code.
 */
@Schema({ _id: false })
export class HumanNameEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['official', 'usual', 'maiden', 'alias'],
    required: true,
  })
  use!: 'official' | 'usual' | 'maiden' | 'alias'

  @Prop({ type: SchemaTypes.String, required: true })
  text!: string

  @Prop({ type: SchemaTypes.String })
  family?: string

  @Prop({ type: [SchemaTypes.String], default: [] })
  given!: string[]

  @Prop({ type: [SchemaTypes.String], default: [] })
  prefix!: string[]

  @Prop({ type: [SchemaTypes.String], default: [] })
  suffix!: string[]

  @Prop({ type: SchemaTypes.String })
  script?: string
}

/**
 * Mongoose schema of an embedded human name.
 */
export const HumanNameSchema = SchemaFactory.createForClass(HumanNameEntity)
