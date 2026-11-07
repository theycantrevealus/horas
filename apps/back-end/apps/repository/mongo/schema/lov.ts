import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { TimeManagement } from '@utility/time'
import { HydratedDocument, SchemaTypes } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './common/actor-ref'

/**
 * Hydrated Mongoose document of a LOV record.
 */
export type LovDocument = HydratedDocument<LovEntity>

/**
 * Mongo storage shape of a LOV record. Only the Mongo repository uses it;
 * the rest of the application uses the `LOV` model. The collection is pinned to
 * `lovs`, the name Mongoose derived from the previous `LOV` class name.
 *
 * @property group_name - Group the value belongs to.
 * @property set_value - Stored value; unique across the collection.
 * @property description - Human-readable description.
 * @property additional - Free-form extra data.
 * @property created_by - Account that created the record.
 * @property created_at - Creation date.
 * @property updated_at - Last update date.
 * @property deleted_at - Soft-delete date, or `null` when active.
 */
@Schema({ collection: 'lovs' })
export class LovEntity {
  @Prop({ type: SchemaTypes.String })
  group_name!: string

  @Prop({ type: SchemaTypes.String, unique: true })
  set_value!: string

  @Prop({ type: SchemaTypes.String })
  description?: string

  @Prop({ type: SchemaTypes.Mixed })
  additional?: Record<string, unknown>

  @Prop({ type: ActorRefSchema })
  created_by?: ActorRef

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  created_at?: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new TimeManagement().getTimezone('Asia/Jakarta'),
  })
  updated_at?: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at?: Date | null
}

/**
 * Mongoose schema generated from `LovEntity`.
 */
export const LovSchema = SchemaFactory.createForClass(LovEntity)
