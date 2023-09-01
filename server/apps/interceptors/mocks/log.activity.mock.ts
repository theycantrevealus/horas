import { mockAccount } from '@core/account/mock/account.mock'

export const mockLogLoginModel = {
  new: jest.fn().mockResolvedValue(mockAccount()),
  find: jest.fn().mockImplementation(),
  aggregate: jest.fn().mockImplementation(),
  findOne: jest.fn().mockImplementation(),
  findOneAndUpdate: jest.fn().mockImplementation(),
  update: jest.fn().mockImplementation(),
  create: jest.fn().mockImplementation(),
  save: jest.fn().mockImplementation(),
  exec: jest.fn().mockImplementation(),
}
