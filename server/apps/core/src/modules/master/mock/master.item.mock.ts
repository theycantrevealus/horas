import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { mockAccount } from '@core/account/mock/account.mock'
import { Account } from '@core/account/schemas/account.model'
import {
  MasterItemAddDTO,
  MasterItemEditDTO,
} from '@core/master/dto/master.item'
import { masterItemBrandArray } from '@core/master/mock/master.item.brand.mock'
import { masterItemCategoryArray } from '@core/master/mock/master.item.category.mock'
import { masterItemUnitArray } from '@core/master/mock/master.item.unit.mock'
import {
  IMasterItemConfiguration,
  MasterItem,
  MasterItemDocument,
} from '@core/master/schemas/master.item'
import { faker } from '@faker-js/faker'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

export const mockMasterItemService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest
    .fn()
    .mockImplementation((dto: MasterItemAddDTO, account: Account) => {
      return Promise.resolve({
        payload: {
          ...dto,
          id: `item-${new Types.ObjectId().toString()}`,
        },
      })
    }),
  edit: jest.fn().mockImplementation((dto: MasterItemEditDTO, id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockImplementation((id: string) => {
    return Promise.resolve({
      payload: {
        id: id,
      },
    })
  }),
}

export const mockMasterItem = (
  id = `item-${new Types.ObjectId().toString()}`,
  code = 'BRD-0001',
  name = faker.company.name(),
  configuration: IMasterItemConfiguration = {
    allow_sell: true,
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
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterItem => ({
  id,
  code,
  name,
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
  constructor: jest.fn().mockResolvedValue(mockMasterItem()),
  find: jest.fn(),
  aggregate: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  exec: jest.fn(),
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
    first_name: faker.name.firstName(),
    last_name: faker.name.lastName(),
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
    {
      allow_sell: true,
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
    {
      allow_sell: true,
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
