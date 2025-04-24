import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import {
  PurchaseRequisition,
  PurchaseRequisitionDocument,
} from '@schemas/inventory/purchase.requisition'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockPurchaseRequisition = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'PR-00001',
  transaction_date = new Date(),
  material_requisition = {
    id: '',
    code: '',
    transaction_date: new Date(),
    created_by: {
      id: `account-${new Types.ObjectId().toString()}`,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email(),
    },
  },
  detail = [
    {
      item: {
        id: 'item-xxx',
        code: 'ITM01',
        name: 'Item 1',
        brand: null,
      },
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
): PurchaseRequisition => ({
  id,
  locale,
  code,
  transaction_date,
  material_requisition,
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

export const mockPurchaseRequisitionModel = {
  new: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  countDocuments: jest.fn().mockResolvedValue(1),
  update: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  create: jest.fn().mockResolvedValue(mockPurchaseRequisition()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockPurchaseRequisitionDoc = (
  mock?: Partial<PurchaseRequisition>
): Partial<PurchaseRequisitionDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  transaction_date: mock?.transaction_date || new Date(),
  material_requisition: mock?.material_requisition,
  detail: mock?.detail || [],
  status: mock?.status || 'new',
  approval_history: mock?.approval_history || [],
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

export const mockPurchaseRequisitionArray = [
  mockPurchaseRequisition(),
  mockPurchaseRequisition(),
  mockPurchaseRequisition(),
]

export const mockPurchaseRequisitionDocArray = [
  mockPurchaseRequisitionDoc({
    id: 'test',
    locale: {
      language_code: '',
      iso_2_digits: '',
      currency: '',
      timezone: '',
    },
    code: '',
    transaction_date: new Date(),
    material_requisition: {
      id: '',
      code: '',
      transaction_date: new Date(),
      created_by: {
        id: `account-${new Types.ObjectId().toString()}`,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        email: faker.internet.email(),
      },
    },
    detail: [
      {
        item: {
          id: 'item-xxx',
          code: 'ITM01',
          name: 'Item 1',
          brand: null,
        },
        qty: 2,
        remark: '-',
      },
    ],
    status: 'new',
    approval_history: [],
    extras: {},
    remark: '',
    created_by: mockAccount(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  }),
  mockPurchaseRequisitionDoc(),
  mockPurchaseRequisitionDoc(),
]
