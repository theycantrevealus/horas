import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { IMasterStockPointConfiguration } from '@gateway_core/master/interface/master.stock.point.configuration'
import {
  MasterStockPoint,
  MasterStockPointDocument,
} from '@schemas/master/master.stock.point'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterStockPointService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterStockPointAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `stock_point-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest
//     .fn()
//     .mockImplementation((dto: MasterStockPointEditDTO, id: string) => {
//       return Promise.resolve({
//         payload: {
//           id: id,
//           ...dto,
//         },
//       })
//     }),
//   detail: jest.fn().mockResolvedValue((dto: any) => dto),
//   delete: jest.fn().mockImplementation((id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//       },
//     })
//   }),
// }

export const mockMasterStockPoint = (
  id = `stock_point-${new Types.ObjectId().toString()}`,
  code = 'BRD-0001',
  name = faker.company.name(),
  configuration: IMasterStockPointConfiguration = {
    allow_grn: true,
    allow_incoming: true,
    allow_outgoing: true,
    allow_destruction: true,
  },
  meta = {
    branch: '',
    commit: '',
  },
  remark = '',
  created_by: IAccountCreatedBy = {
    id: `account-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterStockPoint => ({
  id,
  code,
  name,
  configuration,
  remark,
  meta,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterStockPointModel = {
  new: jest.fn().mockResolvedValue(mockMasterStockPoint()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterStockPoint()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterStockPoint()),
  update: jest.fn().mockResolvedValue(mockMasterStockPoint()),
  create: jest.fn().mockResolvedValue(mockMasterStockPoint()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterStockPointDoc = (
  mock?: Partial<MasterStockPoint>
): Partial<MasterStockPointDocument> => ({
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

// export const masterStockPointArray = [
//   mockMasterStockPoint(),
//   mockMasterStockPoint(
//     `stock_point-${new Types.ObjectId().toString()}`,
//     'BRD-0001',
//     '',
//     {
//       allow_grn: true,
//       allow_incoming: true,
//       allow_outgoing: true,
//       allow_destruction: true,
//     },
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     null
//   ),
//   mockMasterStockPoint(
//     `stock_point-${new Types.ObjectId().toString()}`,
//     'BRD-0002',
//     '',
//     {
//       allow_grn: true,
//       allow_incoming: true,
//       allow_outgoing: true,
//       allow_destruction: true,
//     },
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta')
//   ),
// ]

export const masterStockPointDocArray = [
  mockMasterStockPointDoc(),
  mockMasterStockPointDoc({
    code: 'XX-002',
    name: faker.person.firstName(),
    remark: '',
  }),
  mockMasterStockPointDoc({
    code: 'XX-001',
    name: faker.person.firstName(),
    remark: '',
  }),
]
