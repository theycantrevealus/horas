import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ILOV } from '@schemas/lov/lov'
import { IMasterPartner } from '@schemas/master/master.partner'
import {
  IMasterTreatmentPriceRate,
  MasterTreatment,
  MasterTreatmentDocument,
} from '@schemas/master/master.treatment'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterTreatmentService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterTreatmentAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `treatment-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest
//     .fn()
//     .mockImplementation((dto: MasterTreatmentEditDTO, id: string) => {
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

export const mockMasterTreatment = (
  id = `treatment-${new Types.ObjectId().toString()}`,
  code = 'MSRTRT-0001',
  name = faker.company.name(),
  remark = 'Example remark',
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  group: ILOV[] = [],
  rate: IMasterTreatmentPriceRate[] = [],
  partner: IMasterPartner[] = [],
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterTreatment => ({
  id,
  code,
  name,
  remark,
  created_by,
  group,
  rate,
  partner,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterTreatmentModel = {
  new: jest.fn().mockResolvedValue(mockMasterTreatment()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterTreatment()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterTreatment()),
  update: jest.fn().mockResolvedValue(mockMasterTreatment()),
  create: jest.fn().mockResolvedValue(mockMasterTreatment()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterTreatmentDoc = (
  mock?: Partial<MasterTreatment>
): Partial<MasterTreatmentDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
  remark: mock?.remark || '',
  group: [],
  rate: [],
  partner: [],
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

// export const masterTreatmentArray = [
//   mockMasterTreatment(),
//   mockMasterTreatment(
//     `treatment-${new Types.ObjectId().toString()}`,
//     'MSRTRT-0001',
//     '',
//     '',
//     mockAccount(),
//     [],
//     [],
//     [],
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     null
//   ),
//   mockMasterTreatment(
//     `treatment-${new Types.ObjectId().toString()}`,
//     'MSRTRT-0002',
//     '',
//     '',
//     mockAccount(),
//     [],
//     [],
//     [],
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta')
//   ),
// ]

export const masterTreatmentDocArray = [
  mockMasterTreatmentDoc(),
  mockMasterTreatmentDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    remark: '',
  }),
  mockMasterTreatmentDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    remark: '',
  }),
]
