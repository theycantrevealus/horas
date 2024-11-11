import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  MasterItemBrand,
  MasterItemBrandDocument,
} from '@schemas/master/master.item.brand'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterItemBrandService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterItemBrandAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `brand-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest
//     .fn()
//     .mockImplementation((dto: MasterItemBrandEditDTO, id: string) => {
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

export const mockMasterItemBrand = (
  id = `brand-${new Types.ObjectId().toString()}`,
  code = 'BRD-0001',
  name = faker.company.name(),
  remark = '',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterItemBrand => ({
  id,
  code,
  name,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemBrandModel = {
  new: jest.fn().mockResolvedValue(mockMasterItemBrand()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItemBrand()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItemBrand()),
  update: jest.fn().mockResolvedValue(mockMasterItemBrand()),
  create: jest.fn().mockResolvedValue(mockMasterItemBrand()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemBrandDoc = (
  mock?: Partial<MasterItemBrand>
): Partial<MasterItemBrandDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
  remark: mock?.remark || '',
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

export const masterItemBrandArray = [
  mockMasterItemBrand(),
  mockMasterItemBrand(
    `brand-${new Types.ObjectId().toString()}`,
    'BRD-0001',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterItemBrand(
    `brand-${new Types.ObjectId().toString()}`,
    'BRD-0002',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
]

export const masterItemBrandDocArray = [
  mockMasterItemBrandDoc(),
  mockMasterItemBrandDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    remark: '',
  }),
  mockMasterItemBrandDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    remark: '',
  }),
]
