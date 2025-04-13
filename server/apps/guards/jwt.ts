import { PermissionDescriptor } from '@decorators/permission'
import {
  IAccount,
  IAccountAccess,
} from '@gateway_core/account/interface/account.create_by'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import {
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { JWTTokenDecodeResponse } from '@security/auth.dto'
import { AuthService } from '@security/auth.service'
import { GlobalResponse } from '@utility/dto/response'
import { modCodes } from '@utility/modules'
import { Cache } from 'cache-manager'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly reflector: Reflector,
    private authService: AuthService
  ) {
    super()
  }

  // handleRequest(err, account) {
  //   if (err || !account) {
  //     throw err || new ForbiddenException()
  //   }
  //   return account
  // }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.FORBIDDEN,
        customCode: modCodes.Global.failed,
        classCode: 'CORE',
      },
      message: '',
      payload: {},
      transaction_classify: 'CORE',
      transaction_id: '',
    } satisfies GlobalResponse

    try {
      const secured = this.reflector.get<string[]>(
        'secured',
        context.getHandler()
      )

      const permissionIdentifier = this.reflector.get<PermissionDescriptor[]>(
        'permission',
        context.getHandler()
      )

      if (!permissionIdentifier || permissionIdentifier.length <= 0) {
        response.message = 'This endpoint is not configured properly'
        throw new Error(JSON.stringify(response))
      }

      if (!secured) {
        return true
      }

      const request = context.switchToHttp().getRequest()

      if (!request.headers.authorization) {
        response.message = 'Unauthorized'
        throw new Error(JSON.stringify(response))
      }

      const header_token = request.headers.authorization
      if (!header_token) {
        response.message = 'Unauthorized'
        throw new Error(JSON.stringify(response))
      }
      const token = header_token.split('Bearer')[1]
      const decodeTokenResponse: JWTTokenDecodeResponse =
        await this.authService.validate_token({
          token: token,
        })

      delete decodeTokenResponse?.account?.created_at
      request.credential = decodeTokenResponse.account as IAccount
      const accountDetail: IAccountAccess = await this.cacheManager.get(
        request?.credential?.id
      )
      const permissionFind = `${
        permissionIdentifier[0].group
      }${permissionIdentifier[0].action
        .charAt(0)
        .toUpperCase()}${permissionIdentifier[0].action.slice(1)}`

      let permissionFound

      if (accountDetail?.permission && accountDetail?.permission.length > 0) {
        permissionFound = accountDetail?.permission.find(
          (o) => o.dispatchName === permissionFind
        )
      }

      if (
        !decodeTokenResponse ||
        !decodeTokenResponse.token ||
        !decodeTokenResponse.account
      ) {
        response.message = decodeTokenResponse.message
        throw new Error(JSON.stringify(response))
      }

      if (!permissionFound) {
        response.message = `Not permitted to ${permissionIdentifier[0].action} => ${permissionIdentifier[0].group}`
        throw new Error(JSON.stringify(response))
      }

      return true
    } catch (jwtGuardError) {
      response.message = jwtGuardError.message
      throw new Error(JSON.stringify(response))
    }
  }
}
