import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'
import { type ActorKind } from '@utility/history/actor'

/**
 * Mongo storage shape of an `ActorRef` snapshot: who performed an action.
 *
 * @property account_id - Account identifier, or `null` for system actors.
 * @property display_name - Name shown in history at the time.
 * @property kind - Kind of actor.
 * @property on_behalf_of_account_id - Account acted for, when any.
 */
@Schema({ _id: false })
export class ActorRefEntity {
  @Prop({ type: SchemaTypes.String, default: null })
  account_id!: string | null

  @Prop({ type: SchemaTypes.String, required: true })
  display_name!: string

  @Prop({
    type: SchemaTypes.String,
    enum: ['account', 'system', 'service'],
    required: true,
  })
  kind!: ActorKind

  @Prop({ type: SchemaTypes.String })
  on_behalf_of_account_id?: string
}

/**
 * Mongoose schema of an embedded actor snapshot.
 */
export const ActorRefSchema = SchemaFactory.createForClass(ActorRefEntity)
