import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { AccountJoin } from '@core/account/schemas/account.join'
import {
  IPatientBasicInfo,
  PatientBasicInfo,
} from '@core/patient/schema/patient.basic'
import {
  IPatientMedicalInfo,
  PatientMedicalInfo,
} from '@core/patient/schema/patient.medical'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, SchemaTypes } from 'mongoose'

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

  // Basic Information Section

  @Prop(raw(PatientBasicInfo))
  basic_info: IPatientBasicInfo

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

  constructor(parameter) {
    this.medical_info = parameter.medical_info
    this.basic_info = parameter.basic_info
    this.created_by = parameter.created_by
  }
}

export const PatientSchema = SchemaFactory.createForClass(Patient)
