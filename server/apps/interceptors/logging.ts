import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { GlobalResponse, GlobalResponseParsed } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { FastifyRequest } from 'fastify'
import { Observable, tap } from 'rxjs'
import { Logger } from 'winston'

export interface Response<T> {
  data: T
}

@Injectable()
export class LoggingInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const TM = new TimeManagement()
    const http = context.switchToHttp()
    const request = http.getRequest()
    const response = http.getResponse()
    const path = this.reflector.get<string[]>(
      PATH_METADATA,
      context.getHandler()
    )
    const method = isExpressRequest(request)
      ? request.method
      : (request as FastifyRequest).method

    // const authorization = isExpressRequest(request)
    //   ? request.headers['Authorization']
    //   : (request as FastifyRequest).headers?.authorization
    const now = Date.now()
    const { url } = request
    const query = JSON.parse(JSON.stringify(request.query))
    const account: IAccountCreatedBy = request.credential

    return next.handle().pipe(
      tap(async (result: GlobalResponse) => {
        // Intercept response format
        const dataSet: HorasLogging = {
          ip: request.ip,
          path: path.toString(),
          url: url,
          method: method,
          takeTime: Date.now() - now,
          payload: {
            body: request.body ?? {},
            params: request.params,
            query: query,
          },
          result: result,
          account: account,
          time: TM.getTimezone('Asia/Jakarta'),
        }

        this.logger.verbose(dataSet)

        response.code(result.statusCode.defaultCode).send({
          statusCode: `${result.statusCode.classCode}_${result.statusCode.customCode}`,
          message: result.message,
          payload: result.payload,
          transaction_classify: '',
          transaction_id: result.transaction_id,
        } satisfies GlobalResponseParsed)
      })
    )
  }
}
