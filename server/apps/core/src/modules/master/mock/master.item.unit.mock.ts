import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemUnitAddDTO,
  MasterItemUnitEditDTO,
} from '@core/master/dto/master.item.unit'
import {
  MasterItemUnit,
  MasterItemUnitDocument,
} from '@core/master/schemas/master.item.unit'
import { faker } from '@faker-js/faker'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMasterItemUnitService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest
    .fn()
    .mockImplementation((dto: MasterItemUnitAddDTO, account: Account) => {
      return Promise.resolve({
        payload: {
          ...dto,
          id: `item_unit-${new Types.ObjectId().toString()}`,
        },
      })
    }),
  edit: jest
    .fn()
    .mockImplementation((dto: MasterItemUnitEditDTO, id: string) => {
      return Promise.resolve({
        payload: {
          id: id,
        },
      })
    }),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
}

export const mockMasterItemUnit = (
  id = `item_unit-${new Types.ObjectId().toString()}`,
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
): MasterItemUnit => ({
  id,
  code,
  name,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemUnitModel = {
  new: jest.fn().mockResolvedValue(mockMasterItemUnit()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItemUnit()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItemUnit()),
  update: jest.fn().mockResolvedValue(mockMasterItemUnit()),
  create: jest.fn().mockResolvedValue(mockMasterItemUnit()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemUnitDoc = (
  mock?: Partial<MasterItemUnit>
): Partial<MasterItemUnitDocument> => ({
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

export const masterItemUnitArray = [
  mockMasterItemUnit(),
  mockMasterItemUnit(
    `item_unit-${new Types.ObjectId().toString()}`,
    'BRD-0001',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterItemUnit(
    `item_unit-${new Types.ObjectId().toString()}`,
    'BRD-0002',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
]

export const masterItemUnitDocArray = [
  mockMasterItemUnitDoc(),
  mockMasterItemUnitDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    remark: '',
  }),
  mockMasterItemUnitDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    remark: '',
  }),
]
