import {
  AuthorityAddDTO,
  AuthorityEditDTO,
} from '@core/account/dto/authority.dto'
import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { mockAccount } from '@core/account/mock/account.mock'
import { faker } from '@faker-js/faker'
import { Authority, AuthorityDocument } from '@schemas/account/authority.model'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockAuthorityService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest
    .fn()
    .mockImplementation((dto: AuthorityAddDTO, authority: Authority) => {
      return Promise.resolve({
        payload: {
          ...dto,
          id: `authority-${new Types.ObjectId().toString()}`,
        },
      })
    }),
  edit: jest.fn().mockImplementation((dto: AuthorityEditDTO, id: string) => {
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

export const mockAuthority = (
  id = `authority-${new Types.ObjectId().toString()}`,
  code = 'AUT',
  name = 'Authority Example',
  remark = 'Remark',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): Authority => ({
  id,
  code,
  name,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockAuthorityModel = {
  new: jest.fn().mockResolvedValue(mockAuthority()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockAuthority()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockAuthority()),
  update: jest.fn().mockResolvedValue(mockAuthority()),
  create: jest.fn().mockResolvedValue(mockAuthority()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockAuthorityDoc = (
  mock?: Partial<Authority>
): Partial<AuthorityDocument> => ({
  code: mock?.code || `AUT-${new Types.ObjectId().toString()}`,
  name: mock?.name || 'Example Authority',
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

export const authorityArray = [
  mockAuthority(),
  mockAuthority(
    `authority-${new Types.ObjectId().toString()}`,
    'AUTH',
    'Sample Authority',
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
]

export const authorityDocArray = [
  mockAuthorityDoc(),
  mockAuthorityDoc({
    code: 'XX-002',
    name: 'Example Authority 1',
    remark: '',
  }),
  mockAuthorityDoc({
    code: 'XX-001',
    name: 'Example Authority 2',
    remark: '',
  }),
]
