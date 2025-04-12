import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { LOV, LOVDocument } from '@schemas/lov/lov'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockLOV = (
  id = `lov-${new Types.ObjectId().toString()}`,
  name = 'Sample LOV',
  group = `lov-${new Types.ObjectId().toString()}`,
  parent = `lov-${new Types.ObjectId().toString()}`,
  value = 'Sample Value',
  remark = '-',
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): LOV => ({
  id,
  name,
  group,
  parent,
  value,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockLOVModel = {
  new: jest.fn().mockResolvedValue(mockLOV()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockLOV()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockLOV()),
  update: jest.fn().mockResolvedValue(mockLOV()),
  create: jest.fn().mockResolvedValue(mockLOV()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockLOVDoc = (mock?: Partial<LOV>): Partial<LOVDocument> => ({
  name: 'Sample LOV',
  group: `lov-${new Types.ObjectId().toString()}`,
  parent: `lov-${new Types.ObjectId().toString()}`,
  value: 'Sample Value',
  remark: '',
  created_by: mock?.created_by || {
    id: `lov-${new Types.ObjectId().toString()}`,
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

export const mockLOVArray = [mockLOV(), mockLOV(), mockLOV()]

export const mockLOVDocArray = [mockLOVDoc(), mockLOVDoc(), mockLOVDoc()]
