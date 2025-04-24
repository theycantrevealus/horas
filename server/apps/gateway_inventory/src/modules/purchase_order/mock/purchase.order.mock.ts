import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockMasterItemSupplier } from '@gateway_core/master/mock/master.item.supplier.mock'
import { mockPurchaseRequisition } from '@gateway_inventory/purchase_requisition/mock/purchase.requisition.mock'
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from '@schemas/inventory/purchase.order'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockPurchaseOrder = (
  id = `id-${new Types.ObjectId().toString()}`,
  locale = {
    language_code: 'id',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'PO-000001',
  supplier = mockMasterItemSupplier(),
  purchase_date = new Date(),
  purchase_requisition = mockPurchaseRequisition(),
  detail = [
    {
      item: {
        id: 'item-xxx',
        code: 'ITM01',
        name: 'Item 1',
        brand: null,
      },
      qty: 2,
      price: 10,
      discount_type: 'n',
      discount_value: 0,
      remark: '-',
    },
  ],
  total = 20,
  discount_type = 'n',
  discount_value = 0,
  grand_total = 20,
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
): PurchaseOrder => ({
  id,
  locale,
  code,
  supplier,
  purchase_date,
  purchase_requisition,
  detail,
  total,
  discount_type,
  discount_value,
  grand_total,
  status,
  approval_history,
  extras,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockPurchaseOrderModel = {
  new: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  findOneAndDelete: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  update: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  countDocuments: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockResolvedValue(mockPurchaseOrder()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockPurchaseOrderDoc = (
  mock?: Partial<PurchaseOrder>
): Partial<PurchaseOrderDocument> => ({
  id: mock?.id || '',
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  supplier: mock?.supplier,
  purchase_date: mock?.purchase_date || new Date(),
  purchase_requisition: mock?.purchase_requisition,
  detail: mock?.detail || [],
  total: mock?.total,
  discount_type: mock?.discount_type || 'n',
  discount_value: mock?.discount_value || 0,
  grand_total: mock?.grand_total || 0,
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

export const mockPurchaseOrderArray = [
  mockPurchaseOrder(),
  mockPurchaseOrder(),
  mockPurchaseOrder(),
]

export const mockPurchaseOrderDocArray = [
  mockPurchaseOrderDoc(),
  mockPurchaseOrder(),
  mockPurchaseOrder(),
]
