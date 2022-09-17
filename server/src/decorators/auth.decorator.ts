import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

export const Authorization = (secured: boolean) =>
  SetMetadata('secured', secured)

export const CredentialAccount = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.credential
  }
)
