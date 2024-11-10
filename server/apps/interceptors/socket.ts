import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { CustomErrorCode } from '@utility/modules'
import { Observable } from 'rxjs'
import { Logger } from 'winston'

export interface Response<T> {
  data: T
}

@Injectable()
export class SocketInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    private readonly reflector: Reflector,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const http = context.switchToHttp()
    const response = http.getResponse()

    const statusCode: CustomErrorCode = response.payload.statusCode
    if (statusCode.defaultCode) {
      if (statusCode.defaultCode === HttpStatus.OK) {
        return next.handle()
      } else {
        throw new Error('Failed process')
      }
    } else {
      throw new Error('Unknown Error Code')
    }
  }
}
