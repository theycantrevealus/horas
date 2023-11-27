import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { JWTTokenDecodeResponse } from '@security/auth.dto'
import { AuthService } from '@security/auth.service'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private authService: AuthService
  ) {
    super()
  }

  private logger = new Logger('HTTP')

  handleRequest(err, account, info) {
    if (err || !account) {
      throw err || new ForbiddenException()
    }
    return account
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const secured = this.reflector.get<string[]>(
      'secured',
      context.getHandler()
    )

    if (!secured) {
      return true
    }
    const request = context.switchToHttp().getRequest()

    if (!request.headers.authorization) {
      throw new ForbiddenException({
        message: 'Unauthorized',
        data: null,
        errors: null,
      })
    }

    const header_token = request.headers.authorization
    if (!header_token) {
      throw new ForbiddenException({
        message: 'Unauthorized',
        data: null,
        errors: null,
      })
    }
    const token = header_token.split('Bearer')[1]
    const decodeTokenResponse: JWTTokenDecodeResponse =
      await this.authService.validate_token({
        token: token,
      })

    request.credential = decodeTokenResponse.account

    if (!decodeTokenResponse.account) {
      throw new ForbiddenException({
        message: decodeTokenResponse.message,
        data: null,
        errors: null,
      })
    }

    if (
      !decodeTokenResponse ||
      !decodeTokenResponse.token ||
      !decodeTokenResponse.account
    ) {
      throw new ForbiddenException({
        message: decodeTokenResponse.message,
        data: null,
        errors: null,
      })
    }

    return true
  }
}
