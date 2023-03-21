import { raw } from '@nestjs/mongoose'

export interface IPatientMedicalInfo {
  medical_record: string
  register_date: Date
}

export const PatientMedicalInfo = raw({
  medical_record: { type: String },
  register_date: { type: Date },
})
