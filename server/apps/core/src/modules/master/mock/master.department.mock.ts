import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { faker } from '@faker-js/faker'
import {
  MasterDepartment,
  MasterDepartmentDocument,
} from '@schemas/master/master.department'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterDepartmentService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterDepartmentAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `department-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest
//     .fn()
//     .mockImplementation((dto: MasterDepartmentEditDTO, id: string) => {
//       return Promise.resolve({
//         payload: {
//           id: id,
//           ...dto,
//         },
//       })
//     }),
//   detail: jest.fn().mockResolvedValue((dto: any) => dto),
//   delete: jest.fn().mockImplementation((id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//       },
//     })
//   }),
// }

export const mockMasterDepartment = (
  id = `department-${new Types.ObjectId().toString()}`,
  code = 'MSRD-0001',
  name = faker.company.name(),
  remark = 'Example remark',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  configuration = {
    default_consultation_treatment: {
      id: '',
      code: '',
      name: '',
    },
    treatment: [],
    doctor: [],
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterDepartment => ({
  id,
  code,
  name,
  configuration,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterDepartmentModel = {
  new: jest.fn().mockResolvedValue(mockMasterDepartment()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterDepartment()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterDepartment()),
  update: jest.fn().mockResolvedValue(mockMasterDepartment()),
  create: jest.fn().mockResolvedValue(mockMasterDepartment()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterDepartmentDoc = (
  mock?: Partial<MasterDepartment>
): Partial<MasterDepartmentDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
  remark: mock?.remark || '',
  configuration: {
    default_consultation_treatment: {
      id: '',
      code: '',
      name: '',
    },
    treatment: [],
    doctor: [],
  },
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId().toString()}`,
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

// export const masterDepartmentArray = [
//   mockMasterDepartment(),
//   mockMasterDepartment(
//     `department-${new Types.ObjectId().toString()}`,
//     'MSRD-0001',
//     '',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     null
//   ),
//   mockMasterDepartment(
//     `department-${new Types.ObjectId().toString()}`,
//     'MSRD-0002',
//     '',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta')
//   ),
// ]

export const masterDepartmentDocArray = [
  mockMasterDepartmentDoc(),
  mockMasterDepartmentDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    remark: '',
  }),
  mockMasterDepartmentDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    remark: '',
  }),
]
