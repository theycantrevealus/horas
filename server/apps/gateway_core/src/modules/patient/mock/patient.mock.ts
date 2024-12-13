import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { PatientAddDTO } from '@gateway_core/patient/dto/patient.add'
import { PatientEditDTO } from '@gateway_core/patient/dto/patient.edit'
import { Patient, PatientDocument } from '@schemas/patient/patient'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockPatientService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest.fn().mockImplementation((dto: PatientAddDTO) => {
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
  detail: jest.fn().mockResolvedValue(() => {
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
  created_by: IAccount = {
    id: `account-${new Types.ObjectId()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
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
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockImplementation(),
  findOneAndUpdate: jest.fn().mockImplementation(),
  update: jest.fn().mockImplementation(),
  create: jest.fn().mockImplementation(),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
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
    title: mock?.basic_info?.title || faker.definitions.title.toString(),
    first_name: mock?.basic_info?.first_name || faker.person.firstName('male'),
    last_name: mock?.basic_info?.last_name || faker.person.lastName('male'),
    nick_name: mock?.basic_info?.nick_name || faker.person.firstName('male'),
    birth_date: new Date('1990-01-01'),
    birth_place: 'Pematang Siantar',
    gender: 'M',
    marriage_status: 'Never Married',
    postal_code: mock?.basic_info?.postal_code || faker.location.zipCode(),
    contact:
      mock?.basic_info?.contact ||
      `+62${'0###########'.replace(/#+/g, (m) =>
        faker.string.numeric(m.length)
      )}`,
    email: mock?.basic_info?.email || faker.internet.email(),
    address: mock?.basic_info?.address || faker.location.streetAddress(),
    state: mock?.basic_info?.state || faker.location.state(),
    province: mock?.basic_info?.province || 'Sumatera Utara',
    regency: mock?.basic_info?.state || faker.location.city(),
    district: mock?.basic_info?.state || 'Medan Selayang',
    village: mock?.basic_info?.state || 'Medan',
    mother_name: mock?.basic_info?.state || faker.person.firstName('female'),
    father_name: mock?.basic_info?.state || faker.person.firstName('male'),
  },
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
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
      title: faker.definitions.title.toString(),
      first_name: faker.person.firstName('male'),
      last_name: faker.person.lastName('male'),
      nick_name: faker.person.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.location.zipCode(),
      contact: `+62${'0###########'.replace(/#+/g, (m) =>
        faker.string.numeric(m.length)
      )}`,
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      state: faker.location.state(),
      province: 'Sumatera Utara',
      regency: faker.location.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.person.firstName('female'),
      father_name: faker.person.firstName('male'),
    }
  ),
  mockPatient(
    `patient-${new Types.ObjectId().toString()}`,
    { medical_record: '000004', register_date: new Date() },
    {
      id_number: '1234567890123458',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title.toString(),
      first_name: faker.person.firstName('male'),
      last_name: faker.person.lastName('male'),
      nick_name: faker.person.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.location.zipCode(),
      contact: `+62${'0###########'.replace(/#+/g, (m) =>
        faker.string.numeric(m.length)
      )}`,
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      state: faker.location.state(),
      province: 'Sumatera Utara',
      regency: faker.location.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.person.firstName('female'),
      father_name: faker.person.firstName('male'),
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
      title: faker.definitions.title.toString(),
      first_name: faker.person.firstName('male'),
      last_name: faker.person.lastName('male'),
      nick_name: faker.person.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.location.zipCode(),
      contact: `+62${'0###########'.replace(/#+/g, (m) =>
        faker.string.numeric(m.length)
      )}`,
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      state: faker.location.state(),
      province: 'Sumatera Utara',
      regency: faker.location.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.person.firstName('female'),
      father_name: faker.person.firstName('male'),
    },
  }),
  mockPatientDoc({
    id: `patient-${new Types.ObjectId().toString()}`,
    medical_info: { medical_record: '000004', register_date: new Date() },
    basic_info: {
      id_number: '1234567890123458',
      passport: '-',
      driving_license: '-',
      title: faker.definitions.title.toString(),
      first_name: faker.person.firstName('male'),
      last_name: faker.person.lastName('male'),
      nick_name: faker.person.firstName('male'),
      birth_date: new Date('1990-01-01'),
      birth_place: 'Pematang Siantar',
      gender: 'M',
      marriage_status: 'Never Married',
      postal_code: faker.location.zipCode(),
      contact: `+62${'0###########'.replace(/#+/g, (m) =>
        faker.string.numeric(m.length)
      )}`,
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      state: faker.location.state(),
      province: 'Sumatera Utara',
      regency: faker.location.city(),
      district: 'Medan Selayang',
      village: 'Medan',
      mother_name: faker.person.firstName('female'),
      father_name: faker.person.firstName('male'),
    },
  }),
]
