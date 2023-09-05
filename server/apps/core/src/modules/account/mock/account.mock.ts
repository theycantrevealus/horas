import { AccountAddDTO } from '@core/account/dto/account.add.dto'
import { AccountEditDTO } from '@core/account/dto/account.edit.dto'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { IAuthority } from '@core/account/schemas/authority.model'
import { IMenu, IMenuPermission } from '@core/menu/schemas/menu.model'
import { faker } from '@faker-js/faker'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockAccountService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest.fn().mockImplementation((dto: AccountAddDTO, account: Account) => {
    return Promise.resolve({
      payload: {
        ...dto,
        id: `account-${new Types.ObjectId().toString()}`,
      },
    })
  }),
  edit: jest.fn().mockImplementation((dto: AccountEditDTO, id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  find: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
  signin: jest.fn().mockResolvedValue((dto) => dto),
  token_coordinator: jest.fn().mockResolvedValue((dto) => dto),
}

export const mockAccount = (
  id = `account-${new Types.ObjectId().toString()}`,
  code = '',
  authority: IAuthority = {
    id: `authority-${new Types.ObjectId().toString()}`,
    code: 'XXXX',
    name: 'Example Authority',
  },
  email = faker.internet.email(),
  first_name = faker.person.firstName(),
  last_name = faker.person.lastName(),
  password = '',
  phone = faker.phone.number(),
  access: IMenu[] = [],
  permission: IMenuPermission[] = [],
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): Account => ({
  id,
  code,
  authority,
  email,
  first_name,
  last_name,
  password,
  phone,
  access,
  permission,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockAccountModel = {
  new: jest.fn().mockResolvedValue(mockAccount()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockAccount()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockAccount()),
  update: jest.fn().mockResolvedValue(mockAccount()),
  create: jest.fn().mockResolvedValue(mockAccount()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockAccountDoc = (
  mock?: Partial<Account>
): Partial<AccountDocument> => ({
  authority: {
    id: `authority-${new Types.ObjectId().toString()}`,
    code: 'XXXX',
    name: 'Example Authority',
  },
  first_name: mock?.first_name || faker.person.firstName(),
  last_name: mock?.last_name || faker.person.lastName(),
  email: mock?.email || faker.internet.email(),
  password: mock?.password || '',
  phone: mock?.phone || faker.phone.number(),
  access: mock?.access || [],
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

export const accountArray = [
  mockAccount(),
  mockAccount(
    `account-${new Types.ObjectId().toString()}`,
    'XX-XX',
    {
      id: `authority-${new Types.ObjectId().toString()}`,
      code: 'XXXX',
      name: 'Example Authority',
    },
    faker.internet.email(),
    faker.person.firstName(),
    faker.person.lastName(),
    '12345678',
    '6285261516666',
    [],
    [],
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockAccount(
    `account-${new Types.ObjectId().toString()}`,
    'XX-XX',
    {
      id: `authority-${new Types.ObjectId().toString()}`,
      code: 'XXXX',
      name: 'Example Authority',
    },
    faker.internet.email(),
    faker.person.firstName(),
    faker.person.lastName(),
    '12345678',
    '6285261517777',
    [],
    [],
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
]

export const accountDocArray = [
  mockAccountDoc(),
  mockAccountDoc({
    authority: {
      id: `authority-${new Types.ObjectId().toString()}`,
      code: 'XXXX',
      name: 'Example Authority',
    },
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    password: '123456',
    phone: faker.phone.number(),
    access: [],
  }),
  mockAccountDoc({
    authority: {
      id: `authority-${new Types.ObjectId().toString()}`,
      code: 'XXXX',
      name: 'Example Authority',
    },
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
    password: '',
    phone: faker.phone.number(),
    access: [],
  }),
]
