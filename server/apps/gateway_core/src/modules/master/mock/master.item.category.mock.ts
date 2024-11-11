import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  MasterItemCategory,
  MasterItemCategoryDocument,
} from '@schemas/master/master.item.category'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterItemCategoryService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterItemCategoryAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `category-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest
//     .fn()
//     .mockImplementation((dto: MasterItemCategoryEditDTO, id: string) => {
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

export const mockMasterItemCategory = (
  id = `category-${new Types.ObjectId().toString()}`,
  code = 'CAT-0001',
  name = 'Drugs',
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
): MasterItemCategory => ({
  id,
  code,
  name,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemCategoryModel = {
  new: jest.fn().mockResolvedValue(mockMasterItemCategory()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItemCategory()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItemCategory()),
  update: jest.fn().mockResolvedValue(mockMasterItemCategory()),
  create: jest.fn().mockResolvedValue(mockMasterItemCategory()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemCategoryDoc = (
  mock?: Partial<MasterItemCategory>
): Partial<MasterItemCategoryDocument> => ({
  id: mock?.id || `item_category-${new Types.ObjectId().toString()}`,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || 'Drugs',
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

export const masterItemCategoryArray = [
  mockMasterItemCategory(),
  mockMasterItemCategory(
    `item_category-${new Types.ObjectId().toString()}`,
    `item_category-${new Types.ObjectId().toString()}`,
    'CAT-0001',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterItemCategory(
    `item_category-${new Types.ObjectId().toString()}`,
    `item_category-${new Types.ObjectId().toString()}`,
    'CAT-0002',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
]

export const masterItemCategoryDocArray = [
  mockMasterItemCategoryDoc(),
  mockMasterItemCategoryDoc({
    code: 'XX-002',
    name: 'Drugs',
    remark: '',
  }),
  mockMasterItemCategoryDoc({
    code: 'XX-001',
    name: 'Drugs',
    remark: '',
  }),
]
