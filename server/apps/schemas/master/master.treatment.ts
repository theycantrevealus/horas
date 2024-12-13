import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import { ILOV } from '@schemas/lov/lov.interface'
import { LOVJoin } from '@schemas/lov/lov.join'
import {
  IMasterPartner,
  MasterPartnerJoin,
} from '@schemas/master/master.partner'
import { IMasterTreatmentPriceRate } from '@schemas/master/master.treatment.interface'
import { MasterTreatmentPriceRateJoin } from '@schemas/master/master.treatment.join'
import { HydratedDocument, SchemaTypes } from 'mongoose'

export type MasterTreatmentDocument = HydratedDocument<MasterTreatment>

@Schema({ collection: 'master_treatment' })
export class MasterTreatment {
  @Prop({ type: SchemaTypes.String, unique: true })
  id: string

  @Prop({ type: SchemaTypes.String, required: true, unique: true })
  code: string

  @Prop({ type: SchemaTypes.String, required: true })
  name: string

  @Prop({ type: SchemaTypes.String })
  remark: string

  @Prop({
    unique: false,
    required: false,
    type: [LOVJoin],
    _id: false,
  })
  group: ILOV[]

  @Prop({
    unique: false,
    required: false,
    type: [MasterTreatmentPriceRateJoin],
    _id: false,
  })
  rate: IMasterTreatmentPriceRate[]

  @Prop({
    unique: true,
    required: false,
    type: [MasterPartnerJoin],
    _id: false,
  })
  partner: IMasterPartner[]

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

export const MasterTreatmentSchema =
  SchemaFactory.createForClass(MasterTreatment)
