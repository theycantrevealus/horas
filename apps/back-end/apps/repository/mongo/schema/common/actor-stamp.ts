import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { SchemaTypes } from 'mongoose'
import { type ActorRef } from '@utility/history/actor'
import { ActorRefSchema } from './actor-ref'

/**
 * Mongo storage shape of an `ActorStamp`: who did something and when.
 *
 * @property by - The actor.
 * @property at - The instant, UTC.
 */
@Schema({ _id: false })
export class ActorStampEntity {
  @Prop({ type: ActorRefSchema, required: true })
  by!: ActorRef

  @Prop({ type: SchemaTypes.Date, required: true })
  at!: Date
}

/**
 * Mongoose schema of an actor stamp.
 */
export const ActorStampSchema = SchemaFactory.createForClass(ActorStampEntity)
