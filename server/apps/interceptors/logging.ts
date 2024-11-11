import { httpInterceptor } from '@interceptors/http'
import { rpcInterceptor } from '@interceptors/rpc'
import { wsInterceptor } from '@interceptors/ws'
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthService } from '@security/auth.service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Observable } from 'rxjs'
import { Logger } from 'winston'

export interface Response<T> {
  data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
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
    if (context.getType() === 'http') {
      return await httpInterceptor(context, next, this.reflector, this.logger)
    } else if (context.getType() === 'rpc') {
      console.log('RPC Logger')
      return await rpcInterceptor(context, next, this.reflector, this.logger)
    } else if (context.getType() === 'ws') {
      return await wsInterceptor(
        context,
        next,
        this.reflector,
        this.logger,
        this.authService
      )
    }
  }
}
