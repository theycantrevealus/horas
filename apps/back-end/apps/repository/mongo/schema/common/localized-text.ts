import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of a `LocalizedText`.
 *
 * @property locale - BCP 47 language tag.
 * @property text - Text in that language.
 */
@Schema({ _id: false })
export class LocalizedTextEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  locale!: string

  @Prop({ type: SchemaTypes.String, required: true })
  text!: string
}

/**
 * Mongoose schema of an embedded localized text.
 */
export const LocalizedTextSchema =
  SchemaFactory.createForClass(LocalizedTextEntity)
