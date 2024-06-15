import { AccountService } from '@core/account/account.service'
import { AccountAddDTO } from '@core/account/dto/account.add.dto'
import { AccountEditDTO } from '@core/account/dto/account.edit.dto'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { IMenu } from '@core/menu/interfaces/menu.interface'
import { IMenuPermission } from '@core/menu/interfaces/menu.permission.interface'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Account, AccountDocument } from '@schemas/account/account.model'
import { IAuthority } from '@schemas/account/authority.model'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockAccountService = {
  accountAll: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[AccountService.name].defaultCode,
      },
      message: '',
      transaction_id: '',
      transaction_classify: '',
      payload: [mockAccount()],
    } satisfies GlobalResponse)
  }),
  accountAdd: jest
    .fn()
    .mockImplementation((dto: AccountAddDTO, account: IAccountCreatedBy) => {
      return Promise.resolve({
        payload: {
          ...dto,
          id: `account-${new Types.ObjectId().toString()}`,
          created_by: account,
        },
      })
    }),
  accountEdit: jest
    .fn()
    .mockImplementation((dto: AccountEditDTO, id: string) => {
      return Promise.resolve({
        payload: {
          id: id,
        },
      })
    }),
  accountDetail: jest.fn().mockResolvedValue((dto) => dto),
  accountFind: jest.fn().mockResolvedValue((dto) => dto),
  accountDelete: jest.fn().mockImplementation((id: string) => {
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
  password = faker.hacker.phrase(),
  phone = `+62${'852########'.replace(/#+/g, (m) =>
    faker.string.numeric(m.length)
  )}`,
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
  phone:
    mock?.phone ||
    `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
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
    phone: `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
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
    phone: `+62${'0###########'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )}`,
    access: [],
  }),
]
