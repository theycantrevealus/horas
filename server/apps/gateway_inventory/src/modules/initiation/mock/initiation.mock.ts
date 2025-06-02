import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockMasterItemBatch } from '@gateway_core/master/mock/master.item.batch.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import {
  StockInitiation,
  StockInitiationDocument,
} from '@schemas/inventory/initiation'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockStockInitiation = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'MUT-0001',
  transaction_date = new Date(),
  stock_point = mockMasterStockPoint(),
  detail = [
    {
      // batch: {
      //   id: 'batch-xx1',
      //   code: 'BAT-001',
      //   item: {
      //     id: 'item-xxx',
      //     code: 'ITM01',
      //     name: 'Item 1',
      //     brand: null,
      //   },
      //   price_buy: 10,
      //   price_sell: 11,
      //   expired: new Date(),
      //   brand: {
      //     id: 'brand-xx1',
      //     code: 'BRAND-001',
      //     name: 'Brand 1',
      //   },
      //   unit: mockMasterItemUnit(),
      // },
      batch: mockMasterItemBatch(),
      qty: 2,
      remark: '-',
    },
  ],
  status = 'new',
  approval_history = [],
  extras = {},
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
): StockInitiation => ({
  id,
  locale,
  code,
  transaction_date,
  stock_point,
  detail,
  status,
  approval_history,
  extras,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockStockInitiationModel = {
  new: jest.fn().mockResolvedValue(mockStockInitiation()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockStockInitiation()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockStockInitiation()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockStockInitiation()),
  update: jest.fn().mockResolvedValue(mockStockInitiation()),
  create: jest.fn().mockResolvedValue(mockStockInitiation()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockStockInitiationDoc = (
  mock?: Partial<StockInitiation>
): Partial<StockInitiationDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  transaction_date: mock?.transaction_date || new Date(),
  stock_point: mock?.stock_point || {
    id: '',
    code: '',
    name: '',
  },
  detail: mock?.detail || [],
  extras: mock?.extras || {},
  status: mock?.status || 'new',
  approval_history: mock?.approval_history || [],
  remark: mock?.remark || '',
  created_by: mock?.created_by || {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at: mock?.created_at || new Date(),
  updated_at: mock?.updated_at || new Date(),
  deleted_at: mock?.deleted_at || null,
})

export const mockStockInitiationArray = [
  mockStockInitiation(),
  mockStockInitiation(),
  mockStockInitiation(),
]

export const mockStockInitiationDocArray = [
  mockStockInitiationDoc(),
  mockStockInitiationDoc(),
  mockStockInitiationDoc(),
]
