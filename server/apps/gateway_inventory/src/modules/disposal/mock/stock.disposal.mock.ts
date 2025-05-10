import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import {
  StockDisposal,
  StockDisposalDocument,
} from '@schemas/inventory/disposal'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockStockDisposal = (
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
      batch: {
        id: 'batch-xx1',
        code: 'BAT-001',
        item: {
          id: 'item-xxx',
          code: 'ITM01',
          name: 'Item 1',
          brand: null,
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
      type: 'Damaged Goods' as const,
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
): StockDisposal => ({
  id,
  locale,
  code,
  transaction_date,
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

export const mockStockDisposalModel = {
  new: jest.fn().mockResolvedValue(mockStockDisposal()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockStockDisposal()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockStockDisposal()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockStockDisposal()),
  update: jest.fn().mockResolvedValue(mockStockDisposal()),
  create: jest.fn().mockResolvedValue(mockStockDisposal()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockStockDisposalDoc = (
  mock?: Partial<StockDisposal>
): Partial<StockDisposalDocument> => ({
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

export const mockStockDisposalArray = [
  mockStockDisposal(),
  mockStockDisposal(),
  mockStockDisposal(),
]

export const mockStockDisposalDocArray = [
  mockStockDisposalDoc(),
  mockStockDisposalDoc(),
  mockStockDisposalDoc(),
]
