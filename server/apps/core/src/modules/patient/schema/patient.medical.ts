import { raw } from '@nestjs/mongoose'

export interface IPatientMedicalInfo {
  medical_record: string
  register_date: Date
}

export const PatientMedicalInfo = raw({
  medical_record: { type: String, example: 'xxxxxx' },
  register_date: { type: Date, example: '2023-01-01' },
})
