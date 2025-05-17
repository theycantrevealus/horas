import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MasterItemBatch,
  MasterItemBatchDocument,
} from '@schemas/master/master.item.batch'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

import { mockMasterItemBrand } from './master.item.brand.mock'
import { mockMasterItem } from './master.item.mock'
import { mockMasterItemUnit } from './master.item.unit.mock'
const time = new TimeManagement()

export const mockMasterItemBatch = (
  id = `item-${new Types.ObjectId().toString()}`,
  code = 'BRD-0001',
  item = mockMasterItem(),
  brand = mockMasterItemBrand(),
  unit = mockMasterItemUnit(),
  price_buy = 10,
  price_sell = 11,
  expired = new Date(),
  remark = '',
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = time.getTimezone('Asia/Jakarta'),
  updated_at = time.getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterItemBatch => ({
  id,
  code,
  item,
  brand,
  unit,
  price_buy,
  price_sell,
  expired,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemBatchModel = {
  new: jest.fn().mockResolvedValue(mockMasterItemBatch()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItemBatch()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItemBatch()),
  update: jest.fn().mockResolvedValue(mockMasterItemBatch()),
  create: jest.fn().mockResolvedValue(mockMasterItemBatch()),
  save: jest.fn().mockImplementation(),
  bulkSave: jest.fn().mockResolvedValue({}),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemBatchDoc = (
  mock?: Partial<MasterItemBatch>
): Partial<MasterItemBatchDocument> => ({
  id: mock?.id || `item-${new Types.ObjectId().toString()}`,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  item: mock?.item || mockMasterItem(),
  brand: mock?.brand || mockMasterItemBrand(),
  unit: mock?.unit || mockMasterItemUnit(),
  price_buy: mock?.price_buy || 10,
  price_sell: mock?.price_sell || 11,
  remark: mock?.remark || '',
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at: mock?.created_at || time.getTimezone('Asia/Jakarta'),
  updated_at: mock?.updated_at || time.getTimezone('Asia/Jakarta'),
  deleted_at: mock?.deleted_at || null,
})

export const masterItemBatchArray = [
  mockMasterItemBatch(),
  mockMasterItemBatch(),
  mockMasterItemBatch(),
]

export const masterItemBatchDocArray = [
  mockMasterItemBatchDoc(),
  mockMasterItemBatchDoc(),
  mockMasterItemBatchDoc(),
]
