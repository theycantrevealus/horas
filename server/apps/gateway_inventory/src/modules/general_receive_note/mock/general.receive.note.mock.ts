import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import { mockPurchaseOrder } from '@gateway_inventory/purchase_order/mock/purchase.order.mock'
import {
  GeneralReceiveNote,
  GeneralReceiveNoteDocument,
} from '@schemas/inventory/general.receive.note'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockGeneralReceiveNote = (
  id = `id-${new Types.ObjectId().toString()}`,
  code = 'GRN-00001',
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  stock_point = mockMasterStockPoint(),
  purchase_order = mockPurchaseOrder(),
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
      pending: 0,
      expired: new Date(),
      remark: '-',
    },
  ],
  extras = {},
  remark = '-',
  created_by: IAccount = mockAccount(),
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): GeneralReceiveNote => ({
  id,
  code,
  locale,
  stock_point,
  purchase_order,
  detail,
  extras,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockGeneralReceiveNoteModel = {
  new: jest.fn().mockResolvedValue(mockGeneralReceiveNote()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockGeneralReceiveNote()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockGeneralReceiveNote()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockGeneralReceiveNote()),
  update: jest.fn().mockResolvedValue(mockGeneralReceiveNote()),
  create: jest.fn().mockImplementation(() => {
    return Promise.resolve(mockGeneralReceiveNote())
  }),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockGeneralReceiveNoteDoc = (
  mock?: Partial<GeneralReceiveNote>
): Partial<GeneralReceiveNoteDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  stock_point: mock?.stock_point || mockMasterStockPoint(),
  detail: mock?.detail || [],
  extras: mock?.extras || {},
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

export const mockGeneralReceiveNoteArray = [
  mockGeneralReceiveNote(),
  mockGeneralReceiveNote(),
  mockGeneralReceiveNote(),
]

export const mockGeneralReceiveNoteDocArray = [
  mockGeneralReceiveNoteDoc(),
  mockGeneralReceiveNoteDoc(),
  mockGeneralReceiveNoteDoc(),
]
