import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import {
  StockAdjustment,
  StockAdjustmentDocument,
} from '@schemas/inventory/adjustment'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockStockAdjustment = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'ADJ-0001',
  stock_point = mockMasterStockPoint(),
  detail = [
    {
      batch: {
        id: 'batch-xx1',
        code: 'BAT-001',
        item: {
          id: 'item-xxx',
          code: 'ITM01',
          name: 'Item 1',
        },
        price_buy: 10,
        price_sell: 11,
        expired: new Date(),
        brand: {
          id: 'brand-xx1',
          code: 'BRAND-001',
          name: 'Brand 1',
        },
      },
      qty: 2,
      remark: '-',
    },
  ],
  extras = {},
  status = 'new',
  approval_history = [],
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
): StockAdjustment => ({
  id,
  locale,
  code,
  stock_point,
  detail,
  extras,
  status,
  approval_history,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockStockAdjustmentModel = {
  new: jest.fn().mockResolvedValue(mockStockAdjustment()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockStockAdjustment()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockStockAdjustment()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockStockAdjustment()),
  update: jest.fn().mockResolvedValue(mockStockAdjustment()),
  create: jest.fn().mockResolvedValue(mockStockAdjustment()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockStockAdjustmentDoc = (
  mock?: Partial<StockAdjustment>
): Partial<StockAdjustmentDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
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

export const mockStockAdjustmentArray = [
  mockStockAdjustment(),
  mockStockAdjustment(),
  mockStockAdjustment(),
]

export const mockStockAdjustmentDocArray = [
  mockStockAdjustmentDoc({
    id: 'test',
    locale: {
      language_code: '',
      iso_2_digits: '',
      currency: '',
      timezone: '',
    },
    code: '',
    stock_point: mockMasterStockPoint(),
    detail: [
      {
        batch: {
          id: 'batch-xx1',
          code: 'BAT-001',
          item: {
            id: 'item-xxx',
            code: 'ITM01',
            name: 'Item 1',
          },
          price_buy: 10,
          price_sell: 11,
          expired: new Date(),
          brand: {
            id: 'brand-xx1',
            code: 'BRAND-001',
            name: 'Brand 1',
          },
        },
        qty: 2,
        remark: '-',
      },
    ],
    extras: {},
    status: 'new',
    approval_history: [],
    remark: '',
    created_by: mockAccount(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  }),
  mockStockAdjustmentDoc(),
  mockStockAdjustmentDoc(),
]
