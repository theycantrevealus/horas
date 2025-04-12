import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  MaterialRequisition,
  MaterialRequisitionDocument,
} from '@schemas/inventory/material.requisition'
import { IMaterialRequisitionDetail } from '@schemas/inventory/material.requisition.detail.interface'
import { ILocale } from '@schemas/locale'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMaterialRequisition = (
  id = `general_issue_note-${new Types.ObjectId().toString()}`,
  locale: ILocale = {
    language_code: 'ID',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'MR-0001',
  transaction_date = new Date(),
  stock_point: IMasterStockPoint = {
    id: '',
    code: '',
    name: '',
  },
  detail: IMaterialRequisitionDetail[] = [
    {
      item: {
        id: 'master_item-xxxxxxx',
        code: faker.commerce.isbn.toString(),
        name: 'Item 1',
        brand: {
          id: 'master_item_brand-xxxxxx',
          code: faker.commerce.isbn.toString(),
          name: '',
        },
      },
      qty: 10,
      issued: 10,
      remark: '',
    },
  ],
  extras = {},
  status = 'new',
  approval_history = [],
  remark = 'Example remark',
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MaterialRequisition => ({
  id,
  locale,
  code,
  transaction_date,
  stock_point,
  detail,
  status,
  extras,
  approval_history,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMaterialRequisitionModel = {
  new: jest.fn().mockResolvedValue(mockMaterialRequisition()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMaterialRequisition()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMaterialRequisition()),
  update: jest.fn().mockResolvedValue(mockMaterialRequisition()),
  create: jest.fn().mockResolvedValue(mockMaterialRequisition()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMaterialRequisitionDoc = (
  mock?: Partial<MaterialRequisition>
): Partial<MaterialRequisitionDocument> => ({
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  transaction_date: mock?.transaction_date || new Date(),
  stock_point: mock?.stock_point,
  detail: mock?.detail,
  extras: mock?.extras,
  status: mock?.status,
  approval_history: mock?.approval_history,
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

export const materialRequisitionDocArray = [
  mockMaterialRequisitionDoc(),
  mockMaterialRequisitionDoc(),
  mockMaterialRequisitionDoc(),
]
