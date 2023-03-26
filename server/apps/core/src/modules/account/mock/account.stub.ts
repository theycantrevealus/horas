import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { IAccount } from '@core/account/interface/account'
import { Types } from 'mongoose'

export const accountStub = (): IAccount => {
  return {
    id: `account-${new Types.ObjectId().toString()}`,
    code: '',
    email: 'johndoe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '0822996633112',
    access: [],
    created_by: {
      id: `account-${new Types.ObjectId().toString()}`,
      first_name: '',
      last_name: '',
      email: '',
    },
  } satisfies IAccount
}

export const accountAddStub = (): AccountAddDTO => {
  return {
    first_name: accountStub().first_name,
    last_name: accountStub().last_name,
    email: accountStub().email,
    password: '12345678',
    phone: accountStub().phone,
  } satisfies AccountAddDTO
}

export const loginStub = (): AccountSignInDTO => {
  return {
    email: accountStub().email,
    password: '12345678',
  } satisfies AccountSignInDTO
}
