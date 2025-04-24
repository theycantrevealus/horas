import { mockAccount } from '@gateway_core/account/mock/account.mock'
import { mockMasterItemBrand } from '@gateway_core/master/mock/master.item.brand.mock'
import { mockMasterItem } from '@gateway_core/master/mock/master.item.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import {
  InventoryStockLog,
  InventoryStockLogDocument,
} from '@schemas/inventory/stock.log'

export const mockInventoryStockLog = (
  batch = {
    id: '',
    code: '',
    item: {
      id: mockMasterItem().id,
      code: mockMasterItem().code,
      name: mockMasterItem().name,
      brand: mockMasterItemBrand(),
    },
    price_buy: 10,
    price_sell: 11,
    expired: new Date(),
  },
  from = {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  to = {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  qty_in = 1,
  qty_out = 0,
  balance = 100,
  transaction_id = '',
  stock_flow_type = 'normal',
  created_by = mockAccount(),
  logged_at = new Date()
): InventoryStockLog => ({
  batch,
  from,
  to,
  qty_in,
  qty_out,
  balance,
  transaction_id,
  stock_flow_type,
  created_by,
  logged_at,
})

export const mockInventoryStockLogModel = {
  new: jest.fn().mockResolvedValue(mockInventoryStockLog()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockInventoryStockLog()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockInventoryStockLog()),
  update: jest.fn().mockResolvedValue(mockInventoryStockLog()),
  create: jest.fn().mockResolvedValue(mockInventoryStockLog()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
  bulkWrite: jest.fn().mockResolvedValue({}),
}

export const mockInventoryStockLogDoc = (
  mock?: Partial<InventoryStockLog>
): Partial<InventoryStockLogDocument> => ({
  batch: {
    id: mock?.batch?.id ?? '',
    code: mock?.batch?.code ?? '',
    item: {
      id: mock?.batch?.item?.id ?? mockMasterItem().id,
      code: mock?.batch?.item?.code ?? mockMasterItem().code,
      name: mock?.batch?.item?.name ?? mockMasterItem().name,
      brand: mock?.batch?.item?.brand ?? null,
    },
    price_buy: mock?.batch?.price_buy ?? 10,
    price_sell: mock?.batch?.price_sell ?? 11,
    expired: mock?.batch?.expired ?? new Date(),
  },
  from: {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  to: {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  qty_in: mock?.qty_in ?? 10,
  qty_out: mock?.qty_out ?? 10,
  balance: mock?.balance ?? 10,
  transaction_id: mock?.transaction_id ?? '',
  stock_flow_type: mock?.stock_flow_type ?? 'normal',
  logged_at: mock?.logged_at ?? new Date(),
  created_by: mock?.created_by ?? mockAccount(),
})

export const mockInventoryStockArray = [
  mockInventoryStockLog(),
  mockInventoryStockLog(),
  mockInventoryStockLog(),
]

export const mockInventoryStockLogDocArray = [
  mockInventoryStockLog(),
  mockInventoryStockLog(),
  mockInventoryStockLog(),
]
