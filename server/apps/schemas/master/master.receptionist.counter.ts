import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ILOV, LOVJoin } from '@schemas/lov/lov'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export type MasterReceptionistCounterDocument =
  HydratedDocument<MasterReceptionistCounter>

@Schema({ collection: 'master_receptionist_counter' })
export class MasterReceptionistCounter {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
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
  created_by: IAccountCreatedBy

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

export const MasterReceptionistCounterSchema = SchemaFactory.createForClass(
  MasterReceptionistCounter
)

export const MasterReceptionistCounterJoin = raw({
  id: { type: String, example: `item-${new Types.ObjectId().toString()}` },
  code: { type: String, example: 'MSTRC00001' },
})
