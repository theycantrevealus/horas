import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common'

export const Authorization = (secured: boolean) =>
  SetMetadata('secured', secured)

export const CredentialAccount = createParamDecorator(
  (data: string, ctx: ExecutionContext): IAccount => {
    const request = ctx.switchToHttp().getRequest()
    const account = <IAccount>request.credential
    return account
  }
)

export const AccountToken = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.headers.authorization.split(' ')[1]
  }
)
