import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountEditDTO } from '@core/account/dto/account.edit'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { Account, AccountDocument } from '@core/account/schemas/account.model'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockAccountService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest.fn().mockResolvedValue((dto: AccountAddDTO, account: Account) => {
    return {}
  }),
  edit: jest.fn().mockResolvedValue((dto: AccountEditDTO, id: string) => {
    return {}
  }),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  find: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockResolvedValue((dto) => dto),
  signin: jest.fn().mockResolvedValue((dto) => dto),
  token_coordinator: jest.fn().mockResolvedValue((dto) => dto),
}

export const mockAccount = (
  email = 'example@domain.com',
  first_name = 'John',
  last_name = 'Doe',
  password = '',
  phone = '6285261510202',
  access: Types.ObjectId[] = [],
  created_by: IAccountCreatedBy = {
    _id: new Types.ObjectId(),
    first_name: 'Hendry',
    last_name: 'Tanaka',
    email: 'theycantrevealus@gmail.com',
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): Account => ({
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
  first_name: mock?.first_name || 'John',
  last_name: mock?.last_name || 'Doe',
  email: mock?.email || 'example@domain.com',
  password: mock?.password || '',
  phone: mock?.phone || '6285261510202',
  access: mock?.access || [],
  created_by: mock?.created_by || {
    _id: new Types.ObjectId(),
    first_name: 'Hendry',
    last_name: 'Tanaka',
    email: 'theycantrevealus@gmail.com',
  },
  created_at:
    mock?.created_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at:
    mock?.updated_at || new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at: mock?.deleted_at || null,
})

export const accountArray = [
  mockAccount(),
  mockAccount('Vitani', 'a new uuid', 'Tabby', ''),
  mockAccount('Simba', 'the king', 'Lion', ''),
]

export const accountDocArray = [
  mockAccountDoc(),
  mockAccountDoc({
    first_name: 'Vitani',
    last_name: 'Doe',
    email: 'vitani_doe@domain.com',
    password: '123456',
    phone: '6285261510200',
    access: [],
  }),
  mockAccountDoc({
    first_name: 'Suarez',
    last_name: 'Doe',
    email: 'suarez_doe@domain.com',
    password: '',
    phone: '6285261510201',
    access: [],
  }),
]
