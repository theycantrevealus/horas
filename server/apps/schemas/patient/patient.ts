import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
import {
  IPatientBasicInfo,
  PatientBasicInfo,
} from '@schemas/patient/patient.basic'
import {
  IPatientMedicalInfo,
  PatientMedicalInfo,
} from '@schemas/patient/patient.medical'
import { HydratedDocument, SchemaTypes, Types } from 'mongoose'

export const PatientJoin = raw({
  id: { type: String, example: `item-${new Types.ObjectId().toString()}` },
  medical_record: { type: String, example: 'John' },
  title: { type: String, example: 'Mr.' },
  first_name: { type: String, example: 'John' },
  last_name: { type: String, example: 'Doe' },
  nick_name: { type: String, example: 'JD' },
  birth_date: { type: Date },
  age: { type: Number },
  gender: { type: String },
})

export type PatientDocument = HydratedDocument<Patient>

@Schema({ collection: 'patient' })
export class Patient {
  @Prop({
    type: SchemaTypes.String,
    unique: true,
  })
  id: string

  @Prop(raw(PatientMedicalInfo))
  medical_info: IPatientMedicalInfo

  @Prop(raw(PatientBasicInfo))
  basic_info: IPatientBasicInfo

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

  constructor(parameter) {
    this.medical_info = parameter.medical_info
    this.basic_info = parameter.basic_info
    this.created_by = parameter.created_by
  }
}

export const PatientSchema = SchemaFactory.createForClass(Patient)
