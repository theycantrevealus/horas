import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of a `ContactPoint`.
 *
 * @property system - Kind of channel.
 * @property value - The number or address.
 * @property use - Work, home or mobile.
 * @property is_primary - Preferred contact of its kind.
 * @property verified_at - When the contact was confirmed, or `null`.
 */
@Schema({ _id: false })
export class ContactPointEntity {
  @Prop({
    type: SchemaTypes.String,
    enum: ['phone', 'email', 'other'],
    required: true,
  })
  system!: 'phone' | 'email' | 'other'

  @Prop({ type: SchemaTypes.String, required: true })
  value!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['work', 'home', 'mobile'],
    required: true,
  })
  use!: 'work' | 'home' | 'mobile'

  @Prop({ type: SchemaTypes.Boolean, default: false })
  is_primary!: boolean

  @Prop({ type: SchemaTypes.Date, default: null })
  verified_at!: Date | null
}

/**
 * Mongoose schema of an embedded contact point.
 */
export const ContactPointSchema =
  SchemaFactory.createForClass(ContactPointEntity)
