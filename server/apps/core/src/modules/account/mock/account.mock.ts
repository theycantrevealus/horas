import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountEditDTO } from '@core/account/dto/account.edit'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { faker } from '@faker-js/faker'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockAccountService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest.fn().mockImplementation((dto: AccountAddDTO, account: Account) => {
    return Promise.resolve({})
  }),
  edit: jest.fn().mockImplementation((dto: AccountEditDTO, id: string) => {
    return Promise.resolve({})
  }),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  find: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockImplementation((dto) => {
    return Promise.resolve({})
  }),
  signin: jest.fn().mockResolvedValue((dto) => dto),
  token_coordinator: jest.fn().mockResolvedValue((dto) => dto),
}

export const mockAccount = (
  id = `account-${new Types.ObjectId().toString()}`,
  email = faker.internet.email(),
  first_name = faker.name.firstName(),
  last_name = faker.name.lastName(),
  password = '',
  phone = faker.phone.number(),
  access: Types.ObjectId[] = [],
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): Account => ({
  id,
  email,
  first_name,
  last_name,
  password,
  phone,
  access,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockAccountModel = {
  new: jest.fn().mockResolvedValue(mockAccount()),
  constructor: jest.fn().mockResolvedValue(mockAccount()),
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

export const mockAccountDoc = (
  mock?: Partial<Account>
): Partial<AccountDocument> => ({
  first_name: mock?.first_name || faker.name.firstName(),
  last_name: mock?.last_name || faker.name.lastName(),
  email: mock?.email || faker.internet.email(),
  password: mock?.password || '',
  phone: mock?.phone || faker.phone.number(),
  access: mock?.access || [],
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

export const accountArray = [
  mockAccount(),
  mockAccount(
    faker.internet.email(),
    faker.name.firstName(),
    faker.name.lastName(),
    ''
  ),
  mockAccount(
    faker.internet.email(),
    faker.name.firstName(),
    faker.name.lastName(),
    ''
  ),
]

export const accountDocArray = [
  mockAccountDoc(),
  mockAccountDoc({
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
    password: '123456',
    phone: faker.phone.number(),
    access: [],
  }),
  mockAccountDoc({
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
    password: '',
    phone: faker.phone.number(),
    access: [],
  }),
]
