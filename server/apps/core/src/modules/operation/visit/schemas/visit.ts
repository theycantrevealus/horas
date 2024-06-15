import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { IMasterQueue } from '@core/master/interface/master.queue'
import { MasterQueueJoin } from '@core/master/schemas/master.queue.join'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.join'
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

export const VisitSchema = SchemaFactory.createForClass(Visit)
