import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ILOV, LOVJoin } from '@schemas/lov/lov'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export const MasterQueueMachineJoin = raw({
  id: { type: String },
  code: { type: String },
})

export type MasterQueueMachineDocument = HydratedDocument<MasterQueueMachine>

@Schema({ collection: 'master_queue' })
export class MasterQueueMachine {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, unique: true })
  code: string

  @Prop({
    unique: false,
    required: false,
    type: [LOVJoin],
    _id: false,
  })
  type: ILOV[]

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop(AccountJoin)
  created_by: IAccount

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

export interface IMasterQueueMachine {
  id: string
  code: string
}

export const MasterQueueMachineSchema =
  SchemaFactory.createForClass(MasterQueueMachine)
