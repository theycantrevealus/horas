import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of a `Coding`.
 *
 * @property system - Code system name.
 * @property code - Code inside the system.
 * @property display - Optional display text.
 */
@Schema({ _id: false })
export class CodingEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  system!: string

  @Prop({ type: SchemaTypes.String, required: true })
  code!: string

  @Prop({ type: SchemaTypes.String })
  display?: string
}

/**
 * Mongoose schema of an embedded coding.
 */
export const CodingSchema = SchemaFactory.createForClass(CodingEntity)
