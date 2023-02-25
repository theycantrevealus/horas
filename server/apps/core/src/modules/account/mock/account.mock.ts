import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountModel } from '@core/account/schemas/account.model'

export const mockAccountService = {
  all: jest.fn().mockResolvedValue((dto) => dto),
  add: jest
    .fn()
    .mockResolvedValue((dto: AccountAddDTO, account: AccountModel) => {
      return {}
    }),
  edit: jest.fn().mockResolvedValue((dto) => dto),
  detail: jest.fn().mockResolvedValue((dto) => dto),
  find: jest.fn().mockResolvedValue((dto) => dto),
  delete: jest.fn().mockResolvedValue((dto) => dto),
  signin: jest.fn().mockResolvedValue((dto) => dto),
  token_coordinator: jest.fn().mockResolvedValue((dto) => dto),
}
