import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  IMasterQueue,
  MasterQueueJoin,
} from '@core/master/schemas/master.queue.machine'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type VisitDocument = HydratedDocument<Visit>
@Schema({ collection: 'operation_queue' })
export class Visit {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop(MasterQueueJoin)
  machine: IMasterQueue

  @Prop({ type: SchemaTypes.Number })
  queue_number: string

  @Prop(raw(AccountJoin))
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

export const VisitSchema = SchemaFactory.createForClass(Visit)
