import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  MasterReceptionistCounter,
  MasterReceptionistCounterDocument,
} from '@schemas/master/master.receptionist.counter'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMasterReceptionistCounter = (
  id = `receptionist_counter-${new Types.ObjectId().toString()}`,
  code = 'MSTRRC-0001',
  type = [],
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
): MasterReceptionistCounter => ({
  id,
  code,
  type,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterReceptionistCounterModel = {
  new: jest.fn().mockResolvedValue(mockMasterReceptionistCounter()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterReceptionistCounter()),
  findOneAndUpdate: jest
    .fn()
    .mockResolvedValue(mockMasterReceptionistCounter()),
  update: jest.fn().mockResolvedValue(mockMasterReceptionistCounter()),
  create: jest.fn().mockResolvedValue(mockMasterReceptionistCounter()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterReceptionistCounterDoc = (
  mock?: Partial<MasterReceptionistCounter>
): Partial<MasterReceptionistCounterDocument> => ({
  code: mock?.code || `MSTRRC-${new Types.ObjectId().toString()}`,
  type: [],
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

export const masterReceptionistCounterArray = [
  mockMasterReceptionistCounter(),
  mockMasterReceptionistCounter(
    `receptionist_counter-${new Types.ObjectId().toString()}`,
    'MSTRRC-0001',
    [],
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterReceptionistCounter(
    `receptionist_counter-${new Types.ObjectId().toString()}`,
    'MSTRRC-0002',
    [],
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta')
  ),
]

export const masterReceptionistCounterDocArray = [
  mockMasterReceptionistCounterDoc(),
  mockMasterReceptionistCounterDoc({
    code: 'XX-002',
    type: [],
    remark: '',
  }),
  mockMasterReceptionistCounterDoc({
    code: 'XX-001',
    type: [],
    remark: '',
  }),
]
