import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import { Mutation, MutationDocument } from '@schemas/inventory/mutation'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMutation = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'MUT-0001',
  transaction_date = new TimeManagement().getTimezone('Asia/Jakarta'),
  from = mockMasterStockPoint(),
  to = mockMasterStockPoint(),
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
): Mutation => ({
  id,
  locale,
  code,
  transaction_date,
  from,
  to,
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

export const mockMutationModel = {
  new: jest.fn().mockResolvedValue(mockMutation()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMutation()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMutation()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockMutation()),
  update: jest.fn().mockResolvedValue(mockMutation()),
  create: jest.fn().mockResolvedValue(mockMutation()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMutationDoc = (
  mock?: Partial<Mutation>
): Partial<MutationDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  transaction_date: mock?.transaction_date || new Date(),
  from: mock?.from || {
    id: '',
    code: '',
    name: '',
  },
  to: mock?.to || {
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

export const mockMutationArray = [
  mockMutation(),
  mockMutation(),
  mockMutation(),
]

export const mockMutationDocArray = [
  mockMutationDoc({
    id: 'test',
    locale: {
      language_code: '',
      iso_2_digits: '',
      currency: '',
      timezone: '',
    },
    code: '',
    transaction_date: new Date(),
    from: mockMasterStockPoint(),
    to: mockMasterStockPoint(),
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
  mockMutationDoc(),
  mockMutationDoc(),
]
