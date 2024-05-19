import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common'

export const Authorization = (secured: boolean) =>
  SetMetadata('secured', secured)

export const CredentialAccount = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.credential
  }
)

export const AccountToken = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.headers.authorization.split(' ')[1]
  }
)
