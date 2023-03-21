import { raw } from '@nestjs/mongoose'

export interface IPatientBasicInfo {
  id_number: string
  passport: string
  driving_license: string
  title: string
  first_name: string
  last_name: string
  nick_name: string
  birth_date: Date
  birth_place: string
  gender: string
  marriage_status: string
  postal_code: string
  contact: string
  email: string
  address: string
  state: string
  province: string
  regency: string
  district: string
  village: string
  mother_name: string
  father_name: string
}

export const PatientBasicInfo = raw({
  id_number: { type: String },
  passport: { type: String },
  driving_license: { type: String },
  title: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  nick_name: { type: String },
  birth_date: { type: Date },
  birth_place: { type: String },
  gender: { type: String },
  marriage_status: { type: String },
  postal_code: { type: String },
  contact: { type: String },
  email: { type: String },
  address: { type: String },
  state: { type: String },
  province: { type: String },
  regency: { type: String },
  district: { type: String },
  village: { type: String },
  mother_name: { type: String },
  father_name: { type: String },
})
