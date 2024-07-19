import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { mockAccount } from '@core/account/mock/account.mock'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import { faker } from '@faker-js/faker'
import { Account } from '@schemas/account/account.model'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@schemas/master/master.item.supplier'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMasterItemSupplierService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest
    .fn()
    .mockImplementation((dto: MasterItemSupplierAddDTO, account: Account) => {
      return Promise.resolve({
        payload: {
          ...dto,
          id: `supplier-${new Types.ObjectId().toString()}`,
        },
      })
    }),
  edit: jest
    .fn()
    .mockImplementation((dto: MasterItemSupplierEditDTO, id: string) => {
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

export const mockMasterItemSupplier = (
  id = `supplier-${new Types.ObjectId().toString()}`,
  code = 'SPP-0001',
  name = faker.company.name(),
  phone = `+62${'0###########'.replace(/#+/g, (m) =>
    faker.string.numeric(m.length)
  )}`,
  email = faker.internet.email(),
  sales_name = faker.person.firstName(),
  address = faker.location.streetAddress(),
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
): MasterItemSupplier => ({
  id,
  code,
  name,
  phone,
  email,
  sales_name,
  address,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemSupplierModel = {
  new: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
  update: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
  create: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemSupplierDoc = (
  mock?: Partial<MasterItemSupplier>
): Partial<MasterItemSupplierDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
  phone:
    mock?.phone ||
    `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
  email: mock?.email || faker.internet.email(),
  sales_name: mock?.sales_name || faker.person.firstName(),
  address: mock?.address || faker.location.streetAddress(),
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

export const masterItemSupplierArray = [
  mockMasterItemSupplier(),
  mockMasterItemSupplier(
    `supplier-${new Types.ObjectId().toString()}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterItemSupplier(
    `supplier-${new Types.ObjectId().toString()}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
]

export const masterItemSupplierDocArray = [
  mockMasterItemSupplierDoc(),
  mockMasterItemSupplierDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    phone: `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
    email: faker.internet.email(),
    sales_name: faker.person.firstName(),
    address: faker.location.streetAddress(),
    remark: '',
  }),
  mockMasterItemSupplierDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    phone: `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
    email: faker.internet.email(),
    sales_name: faker.person.firstName(),
    address: faker.location.streetAddress(),
    remark: '',
  }),
]
