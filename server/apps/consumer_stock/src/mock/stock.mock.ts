import { mockMasterItem } from '@gateway_core/master/mock/master.item.mock'
import { mockMasterStockPoint } from '@gateway_core/master/mock/master.stock.point.mock'
import {
  InventoryStock,
  InventoryStockDocument,
} from '@schemas/inventory/stock'

export const mockInventoryStock = (
  batch = {
    id: '',
    code: '',
    item: {
      id: mockMasterItem().id,
      code: mockMasterItem().code,
      name: mockMasterItem().name,
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
  stock_point = {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  qty = 10,
  storing_label = ''
): InventoryStock => ({
  batch,
  stock_point,
  qty,
  storing_label,
})

export const mockInventoryStockModel = {
  new: jest.fn().mockResolvedValue(mockInventoryStock()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockInventoryStock()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockInventoryStock()),
  update: jest.fn().mockResolvedValue(mockInventoryStock()),
  create: jest.fn().mockResolvedValue(mockInventoryStock()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
  bulkWrite: jest.fn().mockResolvedValue({}),
}

export const mockInventoryStockDoc = (
  mock?: Partial<InventoryStock>
): Partial<InventoryStockDocument> => ({
  batch: {
    id: mock?.batch?.id ?? '',
    code: mock?.batch?.code ?? '',
    item: {
      id: mock?.batch?.item?.id ?? mockMasterItem().id,
      code: mock?.batch?.item?.code ?? mockMasterItem().code,
      name: mock?.batch?.item?.name ?? mockMasterItem().name,
    },
    price_buy: mock?.batch?.price_buy ?? 10,
    price_sell: mock?.batch?.price_sell ?? 11,
    expired: mock?.batch?.expired ?? new Date(),
    brand: mock?.batch?.brand,
  },
  stock_point: {
    id: mockMasterStockPoint().id,
    code: mockMasterStockPoint().code,
    name: mockMasterStockPoint().name,
  },
  qty: mock?.qty ?? 10,
  storing_label: mock?.storing_label ?? '',
})

export const mockInventoryStockArray = [
  mockInventoryStock(),
  mockInventoryStock(),
  mockInventoryStock(),
]

export const mockInventoryStockDocArray = [
  mockInventoryStockDoc(),
  mockInventoryStockDoc(),
  mockInventoryStockDoc(),
]
