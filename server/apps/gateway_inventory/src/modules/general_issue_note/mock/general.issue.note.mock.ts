import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  GeneralIssueNote,
  GeneralIssueNoteDocument,
} from '@schemas/inventory/general.issue.note'
import { IGeneralIssueNoteDetail } from '@schemas/inventory/general.issue.note.detail.interface'
import { ILocale } from '@schemas/locale'
import { IMasterStockPoint } from '@schemas/master/master.stock.point.interface'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockGeneralIssueNote = (
  id = `general_issue_note-${new Types.ObjectId().toString()}`,
  locale: ILocale = {
    language_code: 'ID',
    iso_2_digits: 'ID',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  },
  code = 'GIN-0001',
  transaction_date = new Date(),
  material_requisition = {
    id: 'material_requisition-xxxxxxx',
    code: 'MR-00001',
    transaction_date: new Date(),
    created_by: {
      id: `account-${new Types.ObjectId().toString()}`,
      first_name: faker.person.firstName(),
      last_name: faker.person.lastName(),
      email: faker.internet.email(),
    } as IAccount,
  },
  stock_point_from: IMasterStockPoint = {
    id: '',
    code: '',
    name: '',
  },
  stock_point_to: IMasterStockPoint = {
    id: '',
    code: '',
    name: '',
  },
  detail: IGeneralIssueNoteDetail[] = [
    {
      batch: {
        id: 'master_item_batch-xxxxxx',
        code: faker.commerce.isbn.toString(),
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
        price_buy: 10000,
        price_sell: 12000,
        expired: new Date(),
      },
      qty: 10,
      issued: 10,
      remark: '',
    },
  ],
  extras = {},
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
): GeneralIssueNote => ({
  id,
  locale,
  code,
  transaction_date,
  material_requisition,
  stock_point_from,
  stock_point_to,
  detail,
  extras,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockGeneralIssueNoteModel = {
  new: jest.fn().mockResolvedValue(mockGeneralIssueNote()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockGeneralIssueNote()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockGeneralIssueNote()),
  update: jest.fn().mockResolvedValue(mockGeneralIssueNote()),
  create: jest.fn().mockResolvedValue(mockGeneralIssueNote()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockGeneralIssueNoteDoc = (
  mock?: Partial<GeneralIssueNote>
): Partial<GeneralIssueNoteDocument> => ({
  locale: mock?.locale,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  transaction_date: mock?.transaction_date || new Date(),
  material_requisition: mock?.material_requisition,
  stock_point_from: mock?.stock_point_from,
  stock_point_to: mock?.stock_point_to,
  detail: mock?.detail,
  extras: mock?.extras,
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

// export const masterDepartmentArray = [
//   mockMasterDepartment(),
//   mockMasterDepartment(
//     `department-${new Types.ObjectId().toString()}`,
//     'MSRD-0001',
//     '',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     null
//   ),
//   mockMasterDepartment(
//     `department-${new Types.ObjectId().toString()}`,
//     'MSRD-0002',
//     '',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta')
//   ),
// ]

export const generalIssueNoteDocArray = [
  mockGeneralIssueNoteDoc(),
  mockGeneralIssueNoteDoc(),
  mockGeneralIssueNoteDoc(),
]
