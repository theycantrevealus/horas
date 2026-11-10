import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of an `ExternalId`.
 *
 * @property system - Issuing system.
 * @property value - The identifier.
 */
@Schema({ _id: false })
export class ExternalIdEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  system!: string

  @Prop({ type: SchemaTypes.String, required: true })
  value!: string
}

/**
 * Mongoose schema of an embedded external identifier.
 */
export const ExternalIdSchema = SchemaFactory.createForClass(ExternalIdEntity)
