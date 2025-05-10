import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import { StockAudit, StockAuditDocument } from '@schemas/inventory/audit'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockStockAudit = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  period_from = new Date(),
  period_to = new Date(),
  code = 'MUT-0001',
  transaction_date = new TimeManagement().getTimezone('Asia/Jakarta'),
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
      qty_system: 2,
      qty_actual: 10,
      discrepancy: 8,
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
): StockAudit => ({
  id,
  locale,
  period_from,
  period_to,
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

export const mockStockAuditModel = {
  new: jest.fn().mockResolvedValue(mockStockAudit()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockStockAudit()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockStockAudit()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockStockAudit()),
  update: jest.fn().mockResolvedValue(mockStockAudit()),
  create: jest.fn().mockResolvedValue(mockStockAudit()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockStockAuditDoc = (
  mock?: Partial<StockAudit>
): Partial<StockAuditDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  period_from: mock?.period_from || new Date(),
  period_to: mock?.period_to || new Date(),
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

export const mockStockAuditArray = [
  mockStockAudit(),
  mockStockAudit(),
  mockStockAudit(),
]

export const mockStockAuditDocArray = [
  mockStockAuditDoc({
    id: 'test',
    locale: {
      language_code: '',
      iso_2_digits: '',
      currency: '',
      timezone: '',
    },
    code: '',
    period_from: new Date(),
    period_to: new Date(),
    transaction_date: new Date(),
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
        qty_actual: 2,
        qty_system: 2,
        discrepancy: 0,
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
  mockStockAuditDoc(),
  mockStockAuditDoc(),
]
