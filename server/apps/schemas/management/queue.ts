import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ILOV, LOVJoin } from '@schemas/lov/lov'
import {
  IMasterQueueMachine,
  MasterQueueMachineJoin,
} from '@schemas/master/master.queue.machine'
import {
  IMasterReceptionistCounter,
  MasterReceptionistCounterJoin,
} from '@schemas/master/master.receptionist.counter'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type QueueDocument = HydratedDocument<Queue>

@Schema({ collection: 'queues' })
export class Queue {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({
    required: true,
    type: LOVJoin,
    _id: false,
  })
  type: ILOV

  @Prop({ type: SchemaTypes.Number, required: true, unique: false })
  queue_number: number

  @Prop({
    type: SchemaTypes.Date,
    default: null,
    required: false,
  })
  call_time: Date

  @Prop({
    type: MasterQueueMachineJoin,
    _id: false,
    required: true,
  })
  queue_machine: IMasterQueueMachine

  @Prop({
    type: MasterReceptionistCounterJoin,
    _id: false,
    required: false,
  })
  receptionist_counter: IMasterReceptionistCounter

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const QueueSchema = SchemaFactory.createForClass(Queue)
