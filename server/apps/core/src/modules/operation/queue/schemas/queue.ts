import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import { IMasterQueue } from '@core/master/interface/master.queue'
import { MasterQueueJoin } from '@core/master/schemas/master.queue.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type OperationQueueDocument = HydratedDocument<OperationQueue>
@Schema({ collection: 'operation_queue' })
export class OperationQueue {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop(MasterQueueJoin)
  machine: IMasterQueue

  @Prop({ type: SchemaTypes.Number })
  queue_number: string

  @Prop(AccountJoin)
  created_by: IAccountCreatedBy

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  created_at: Date

  @Prop({
    type: SchemaTypes.Date,
    default: () => new Date(),
    required: true,
  })
  updated_at: Date

  @Prop({ type: SchemaTypes.Mixed, default: null })
  deleted_at: Date | null
}

export const OperationQueueSchema = SchemaFactory.createForClass(OperationQueue)
