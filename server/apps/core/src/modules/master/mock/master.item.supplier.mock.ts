import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemSupplierAddDTO,
  MasterItemSupplierEditDTO,
} from '@core/master/dto/master.item.supplier'
import {
  MasterItemSupplier,
  MasterItemSupplierDocument,
} from '@core/master/schemas/master.item.supplier'
import { faker } from '@faker-js/faker'
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
  phone = faker.phone.number(),
  email = faker.internet.email(),
  sales_name = faker.name.firstName(),
  address = faker.address.streetAddress(),
  remark = '',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
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
  constructor: jest.fn().mockResolvedValue(mockMasterItemSupplier()),
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

export const mockMasterItemSupplierDoc = (
  mock?: Partial<MasterItemSupplier>
): Partial<MasterItemSupplierDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
  phone: mock?.phone || faker.phone.number(),
  email: mock?.email || faker.internet.email(),
  sales_name: mock?.sales_name || faker.name.firstName(),
  address: mock?.address || faker.address.streetAddress(),
  remark: mock?.remark || '',
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId().toString()}`,
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
    name: faker.name.firstName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    sales_name: faker.name.firstName(),
    address: faker.address.streetAddress(),
    remark: '',
  }),
  mockMasterItemSupplierDoc({
    code: 'XX-001',
    name: faker.name.firstName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    sales_name: faker.name.firstName(),
    address: faker.address.streetAddress(),
    remark: '',
  }),
]
