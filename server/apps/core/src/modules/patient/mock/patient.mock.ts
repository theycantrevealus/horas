import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account } from '@core/account/schemas/account.model'
import { PatientAddDTO } from '@core/patient/dto/patient.add'
import { PatientEditDTO } from '@core/patient/dto/patient.edit'
import { Patient, PatientDocument } from '@core/patient/schema/patient.model'
import { faker } from '@faker-js/faker'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockPatientService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest.fn().mockImplementation((dto: PatientAddDTO, account: Account) => {
    return Promise.resolve({
      payload: {
        ...dto,
        id: `patient-${new Types.ObjectId().toString()}`,
      },
    })
  }),
  edit: jest.fn().mockImplementation((dto: PatientEditDTO, id: string) => {
    return Promise.resolve({
      payload: {
        ...dto,
        id: id,
      },
    })
  }),
  detail: jest.fn().mockResolvedValue((dto) => {
    return Promise.resolve({})
  }),
  delete: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
}
export const mockPatient = (
  id = `patient-${new Types.ObjectId().toString()}`,
  medical_info = {
    medical_record: '',
    register_date: new Date('YYYY-MM-DD'),
  },
  basic_info = {
    id_number: '1234567890123456',
    passport: '-',
    driving_license: '-',
    title: 'Mr.',
    first_name: 'John',
    last_name: 'Doe',
    nick_name: 'Johny',
    birth_date: new Date('1990-01-01'),
    birth_place: 'Pematang Siantar',
    gender: 'M',
    marriage_status: 'Never Married',
    postal_code: '123456',
    contact: '6285161510202',
    email: 'johndoe@example.com',
    address: 'Jln. Medan No.10A',
    state: '-',
    province: 'Sumatera Utara',
    regency: 'Kota Medan',
    district: 'Medan Selayang',
    village: 'Medan',
    mother_name: 'Marry',
    father_name: 'Andy',
  },
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId()}`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): Patient => ({
  id,
  medical_info,
  basic_info,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockPatientModel = {
  new: jest.fn().mockResolvedValue(mockPatient()),
  constructor: jest.fn().mockResolvedValue(mockPatient()),
  find: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  exec: jest.fn(),
}

export const mockPatientDoc = (
  mock?: Partial<Patient>
): Partial<PatientDocument> => ({
  id: `patient-${new Types.ObjectId().toString()}`,
  medical_info: {
    medical_record: '',
    register_date: new Date('2023-01-01'),
  },
  basic_info: {
    id_number: '1234567890123456',
    passport: '-',
    driving_license: '-',
    title: mock?.basic_info?.first_name || faker.definitions.title,
    first_name: mock?.basic_info?.first_name || faker.name.firstName('male'),
    last_name: mock?.basic_info?.last_name || faker.name.lastName('male'),
    nick_name: mock?.basic_info?.nick_name || faker.name.firstName('male'),
    birth_date: new Date('1990-01-01'),
    birth_place: 'Pematang Siantar',
    gender: 'M',
    marriage_status: 'Never Married',
    postal_code: mock?.basic_info?.postal_code || faker.address.zipCode(),
    contact: mock?.basic_info?.contact || faker.phone.number(),
    email: mock?.basic_info?.email || faker.internet.email(),
    address: mock?.basic_info?.address || faker.address.streetAddress(),
    state: mock?.basic_info?.state || faker.address.state(),
    province: mock?.basic_info?.province || 'Sumatera Utara',
    regency: mock?.basic_info?.state || faker.address.city(),
    district: mock?.basic_info?.state || 'Medan Selayang',
    village: mock?.basic_info?.state || 'Medan',
    mother_name: mock?.basic_info?.state || faker.name.firstName('female'),
    father_name: mock?.basic_info?.state || faker.name.firstName('male'),
  },
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId()}`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
  },
  created_at:
    mock?.created_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at:
    mock?.updated_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at: mock?.deleted_at || null,
})

export const patientArray = [
  mockPatient(),
  mockPatient(
    `patient-${new Types.ObjectId().toString()}`,
    { medical_record: '000003', register_date: new Date() },
    {
      id_number: '1234567890123457',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title,
      first_name: faker.name.firstName('male'),
      last_name: faker.name.lastName('male'),
      nick_name: faker.name.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.address.zipCode(),
      contact: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.address.streetAddress(),
      state: faker.address.state(),
      province: 'Sumatera Utara',
      regency: faker.address.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.name.firstName('female'),
      father_name: faker.name.firstName('male'),
    }
  ),
  mockPatient(
    `patient-${new Types.ObjectId().toString()}`,
    { medical_record: '000004', register_date: new Date() },
    {
      id_number: '1234567890123458',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title,
      first_name: faker.name.firstName('male'),
      last_name: faker.name.lastName('male'),
      nick_name: faker.name.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.address.zipCode(),
      contact: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.address.streetAddress(),
      state: faker.address.state(),
      province: 'Sumatera Utara',
      regency: faker.address.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.name.firstName('female'),
      father_name: faker.name.firstName('male'),
    }
  ),
]

export const patientDocArray = [
  mockPatientDoc(),
  mockPatientDoc({
    id: `patient-${new Types.ObjectId().toString()}`,
    medical_info: { medical_record: '000003', register_date: new Date() },
    basic_info: {
      id_number: '1234567890123457',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title,
      first_name: faker.name.firstName('male'),
      last_name: faker.name.lastName('male'),
      nick_name: faker.name.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.address.zipCode(),
      contact: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.address.streetAddress(),
      state: faker.address.state(),
      province: 'Sumatera Utara',
      regency: faker.address.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.name.firstName('female'),
      father_name: faker.name.firstName('male'),
    },
  }),
  mockPatientDoc({
    id: `patient-${new Types.ObjectId().toString()}`,
    medical_info: { medical_record: '000004', register_date: new Date() },
    basic_info: {
      id_number: '1234567890123458',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title,
      first_name: faker.name.firstName('male'),
      last_name: faker.name.lastName('male'),
      nick_name: faker.name.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.address.zipCode(),
      contact: faker.phone.number(),
      email: faker.internet.email(),
      address: faker.address.streetAddress(),
      state: faker.address.state(),
      province: 'Sumatera Utara',
      regency: faker.address.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.name.firstName('female'),
      father_name: faker.name.firstName('male'),
    },
  }),
]
