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
  id_number: {
    type: String,
    example: 'xxxx-xxxx-xxxx-xxxx',
    description: '16 digits of identity number',
  },
  passport: { type: String, example: 'xxx-xxxxx' },
  driving_license: { type: String, example: 'xxx-xxxxx' },
  title: { type: String, example: 'Mr., Ms., Mrs.' },
  first_name: { type: String, example: 'John' },
  last_name: { type: String, example: 'Doe' },
  nick_name: { type: String, example: 'Johny', required: false },
  birth_date: { type: Date, example: '1990-01-01' },
  birth_place: { type: String, example: 'Pematang Siantar' },
  gender: {
    type: String,
    length: 1,
    enum: ['M', 'F', 'U'],
    example: 'M',
    description: 'M = Male, F = Female, U = Undefined',
  },
  marriage_status: {
    type: String,
    enum: ['Never Married', 'Married', 'Divorced', 'Separated', 'Widowed'],
    example: 'Never Married',
  },
  postal_code: { type: String, example: 'xxxxxxx' },
  contact: {
    type: String,
    example: '6285261510202',
    description: 'country_code + phone_number',
  },
  email: { type: String, example: 'johndoe@example.com' },
  address: { type: String, example: 'Jln. Medan No.10A' },
  state: { type: String, example: '-', default: '-' },
  province: { type: String, example: 'Sumatera Utara', default: '' },
  regency: { type: String, example: 'Kota Medan', default: '-' },
  district: { type: String, example: 'Medan Selayang', default: '-' },
  village: { type: String, example: '', default: '-' },
  mother_name: { type: String, example: 'Marry' },
  father_name: { type: String, example: 'Andy', required: false },
})
