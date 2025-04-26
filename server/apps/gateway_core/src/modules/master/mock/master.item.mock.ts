import { faker } from '@faker-js/faker'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { masterItemBrandArray } from '@gateway_core/master/mock/master.item.brand.mock'
import { masterItemCategoryArray } from '@gateway_core/master/mock/master.item.category.mock'
import { masterItemUnitArray } from '@gateway_core/master/mock/master.item.unit.mock'
import { MasterItem, MasterItemDocument } from '@schemas/master/master.item'
import { IMasterItemConfiguration } from '@schemas/master/master.item.configuration.interface'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterItemService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterItemAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `item-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest.fn().mockImplementation((dto: MasterItemEditDTO, id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//         ...dto,
//       },
//     })
//   }),
//   detail: jest.fn().mockResolvedValue((dto: any) => dto),
//   delete: jest.fn().mockImplementation((id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//       },
//     })
//   }),
// }

export const mockMasterItem = (
  id = `item-${new Types.ObjectId().toString()}`,
  code = 'BRD-0001',
  name = faker.company.name(),
  alias = '',
  configuration: IMasterItemConfiguration = {
    allow_sell: true,
    allow_destruction: true,
    allow_incoming: true,
    allow_outgoing: true,
    benefit_margin_type: 'n',
    benefit_margin_value: 0,
  },
  category = masterItemCategoryArray,
  unit = masterItemUnitArray[0],
  brand = masterItemBrandArray[0],
  properties = [
    {
      id: `lov-${new Types.ObjectId().toString()}`,
      name: 'ingredients',
      value: 'paracetamol',
    },
  ],
  storing = [
    {
      stock_point: {
        id: `stock_point-${new Types.ObjectId().toString()}`,
        code: 'HRS-001',
        name: 'Main Storage',
      },
      storing_label: '',
      minimum: 5,
      maximum: 10,
    },
  ],
  remark = '',
  created_by: IAccount = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterItem => ({
  id,
  code,
  name,
  alias,
  configuration,
  category,
  unit,
  brand,
  properties,
  storing,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterItemModel = {
  new: jest.fn().mockResolvedValue(mockMasterItem()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterItem()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterItem()),
  update: jest.fn().mockResolvedValue(mockMasterItem()),
  create: jest.fn().mockResolvedValue(mockMasterItem()),
  save: jest.fn().mockImplementation(),
  bulkSave: jest.fn().mockResolvedValue({}),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterItemDoc = (
  mock?: Partial<MasterItem>
): Partial<MasterItemDocument> => ({
  id: mock?.id || `item-${new Types.ObjectId().toString()}`,
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
  name: mock?.name || faker.company.name(),
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

export const masterItemArray = [
  mockMasterItem(),
  mockMasterItem(
    `item-${new Types.ObjectId().toString()}`,
    'ITM-0001',
    '',
    '',
    {
      allow_sell: true,
      allow_destruction: true,
      allow_incoming: true,
      allow_outgoing: true,
      benefit_margin_type: 'n',
      benefit_margin_value: 0,
    },
    [],
    masterItemUnitArray[0],
    masterItemBrandArray[0],
    [
      {
        id: `lov-${new Types.ObjectId().toString()}`,
        name: 'ingredients',
        value: 'paracetamol',
      },
    ],
    [
      {
        stock_point: {
          id: `stock_point-${new Types.ObjectId().toString()}`,
          code: 'HRS-001',
          name: 'Main Storage',
        },
        storing_label: '',
        minimum: 5,
        maximum: 10,
      },
    ],
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
  mockMasterItem(
    `item-${new Types.ObjectId().toString()}`,
    'ITM-0001',
    '',
    '',
    {
      allow_sell: true,
      allow_destruction: true,
      allow_incoming: true,
      allow_outgoing: true,
      benefit_margin_type: 'n',
      benefit_margin_value: 0,
    },
    [],
    masterItemUnitArray[0],
    masterItemBrandArray[0],
    [
      {
        id: `lov-${new Types.ObjectId().toString()}`,
        name: 'ingredients',
        value: 'paracetamol',
      },
    ],
    [
      {
        stock_point: {
          id: `stock_point-${new Types.ObjectId().toString()}`,
          code: 'HRS-001',
          name: 'Main Storage',
        },
        storing_label: '',
        minimum: 5,
        maximum: 10,
      },
    ],
    '',
    mockAccount(),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    new TimeManagement().getTimezone('Asia/Jakarta'),
    null
  ),
]

export const masterItemDocArray = [
  mockMasterItemDoc(),
  mockMasterItemDoc(),
  mockMasterItemDoc(),
]
