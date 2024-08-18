import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import {
  IPatientBasicInfo,
  PatientBasicInfo,
} from '@gateway_core/patient/schema/patient.basic'
import {
  IPatientMedicalInfo,
  PatientMedicalInfo,
} from '@gateway_core/patient/schema/patient.medical'
import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose'
import { AccountJoin } from '@schemas/account/account.raw'
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
