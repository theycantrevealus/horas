import { AccountAddDTO } from '@core/account/dto/account.add'
import { AccountSignInDTO } from '@core/account/dto/account.signin'
import { IAccount } from '@core/account/interface/account'
import { Types } from 'mongoose'

export const accountStub = (): IAccount => {
  return {
    email: 'johndoe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '0822996633112',
    access: [],
    created_by: {
      _id: new Types.ObjectId(),
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
    __v: 0,
  } satisfies AccountAddDTO
}

export const loginStub = (): AccountSignInDTO => {
  return {
    email: accountStub().email,
    password: '12345678',
  } satisfies AccountSignInDTO
}
