import { AccountAddDTO } from '@gateway_core/account/dto/account.dto'
import { AccountSignInDTO } from '@gateway_core/account/dto/account.signin.dto'
import { IAccount } from '@gateway_core/account/interface/account'
import { Types } from 'mongoose'

export const accountStub = (): IAccount => {
  return {
    id: `account-${new Types.ObjectId().toString()}`,
    code: '',
    email: 'johndoe@example.com',
    authority: {
      id: '',
      code: '',
      name: '',
    },
    first_name: 'John',
    last_name: 'Doe',
    phone: '0822996633112',
    access: [],
    permission: [],
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
    authority: accountStub().authority,
    first_name: accountStub().first_name,
    last_name: accountStub().last_name,
    email: accountStub().email,
    password: '12345678',
    phone: accountStub().phone,
    access: [],
    permission: [],
  } satisfies AccountAddDTO
}

export const loginStub = (): AccountSignInDTO => {
  return {
    email: accountStub().email,
    password: '12345678',
  } satisfies AccountSignInDTO
}
