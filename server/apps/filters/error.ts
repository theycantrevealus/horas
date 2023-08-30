import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { isExpressRequest } from '@utility/http'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Logger } from 'winston'

@Catch(Error)
export class CommonErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
  async catch(exception: Error, host: ArgumentsHost) {
    const TM = new TimeManagement()
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest()
    const method = isExpressRequest(request)
      ? request.method
      : (request as FastifyRequest).method
    // TODO : Error code standarization
    const responseSet = {
      code: `ERR_${HttpStatus.BAD_REQUEST}`,
      message: exception.message,
      description: exception.stack ?? '',
      timestamp: new Date().toISOString(),
      path: request.url,
    }
    const account: IAccountCreatedBy = request.credential
    const dataSet: HorasLogging = {
      ip: request.ip,
      path: request.url,
      url: request.url,
      method: method,
      takeTime: response.getResponseTime(),
      payload: {
        body: request.body ?? {},
        params: request.params,
        query: request.query,
      },
      result: responseSet,
      account: account,
      time: TM.getTimezone('Asia/Jakarta'),
    }

    console.log(dataSet)

    this.logger.error(dataSet)

    response.status(HttpStatus.BAD_REQUEST).send(responseSet)
  }
}
