import { faker } from '@faker-js/faker'
import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { MasterItemBrandDocument } from '@schemas/master/master.item.brand'
import { MasterQueue } from '@schemas/master/master.queue.machine'
import { TimeManagement } from '@utility/time'
import { Types } from 'mongoose'

// export const mockMasterQueueService = {
//   all: jest.fn().mockResolvedValue((dto: any) => dto),
//   add: jest.fn().mockImplementation((dto: MasterQueueAddDTO) => {
//     return Promise.resolve({
//       payload: {
//         ...dto,
//         id: `queue-${new Types.ObjectId().toString()}`,
//       },
//     })
//   }),
//   edit: jest.fn().mockImplementation((dto: MasterQueueEditDTO, id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//         ...dto,
//       },
//     })
//   }),
//   detail: jest.fn().mockResolvedValue((dto: dto) => dto),
//   delete: jest.fn().mockImplementation((id: string) => {
//     return Promise.resolve({
//       payload: {
//         id: id,
//       },
//     })
//   }),
// }

export const mockMasterQueue = (
  id = `queue-${new Types.ObjectId().toString()}`,
  code = 'QUE',
  remark = '',
  created_by: IAccountCreatedBy = {
    id: `queue-${new Types.ObjectId().toString()}`,
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    email: faker.internet.email(),
  },
  created_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  updated_at = new TimeManagement().getTimezone('Asia/Jakarta'),
  deleted_at = null
): MasterQueue => ({
  id,
  code,
  remark,
  created_by,
  created_at,
  updated_at,
  deleted_at,
})

export const mockMasterQueueModel = {
  new: jest.fn().mockResolvedValue(mockMasterQueue()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockResolvedValue(mockMasterQueue()),
  findOneAndUpdate: jest.fn().mockResolvedValue(mockMasterQueue()),
  update: jest.fn().mockResolvedValue(mockMasterQueue()),
  create: jest.fn().mockResolvedValue(mockMasterQueue()),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}

export const mockMasterQueueDoc = (
  mock?: Partial<MasterQueue>
): Partial<MasterItemBrandDocument> => ({
  code: mock?.code || `SPP-${new Types.ObjectId().toString()}`,
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

// export const masterQueueArray = [
//   mockMasterQueue(),
//   mockMasterQueue(
//     `brand-${new Types.ObjectId().toString()}`,
//     'BRD-0001',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     null
//   ),
//   mockMasterQueue(
//     `brand-${new Types.ObjectId().toString()}`,
//     'BRD-0002',
//     '',
//     mockAccount(),
//     new TimeManagement().getTimezone('Asia/Jakarta'),
//     new TimeManagement().getTimezone('Asia/Jakarta')
//   ),
// ]

export const masterQueueDocArray = [
  mockMasterQueueDoc(),
  mockMasterQueueDoc({
    code: 'XX-002',
    remark: '',
  }),
  mockMasterQueueDoc({
    code: 'XX-001',
    remark: '',
  }),
]
