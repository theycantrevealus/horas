import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'

/**
 * Mongo storage shape of a `DatePeriod`: local dates as `YYYY-MM-DD` strings.
 *
 * @property start - First day.
 * @property end - Last day, or `null` when open-ended.
 */
@Schema({ _id: false })
export class DatePeriodEntity {
  @Prop({ type: SchemaTypes.String, required: true })
  start!: string

  @Prop({ type: SchemaTypes.String, default: null })
  end!: string | null
}

/**
 * Mongoose schema of an embedded date period.
 */
export const DatePeriodSchema = SchemaFactory.createForClass(DatePeriodEntity)
