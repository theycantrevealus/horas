import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { ArgumentsHost, Catch, ExceptionFilter, Inject } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
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
    let responseSet, statusCode
    const errorPayload = exception.message.replace('Error: ', '').trim()
    if (isJSON(errorPayload)) {
      const parseError: GlobalResponse = JSON.parse(errorPayload)
      responseSet = {
        ...JSON.parse(parseError.message),
        // code: parseError.statusCode,
        // message: JSON.parse(parseError.message),
        // description: exception.stack ?? '',
        timestamp: new Date().toISOString(),
        path: request.url,
      }
      statusCode = parseError.statusCode.defaultCode
    } else {
      responseSet = {
        code: response.statusCode,
        message: JSON.stringify(exception.message),
        description: exception.stack ?? '',
        timestamp: new Date().toISOString(),
        path: request.url,
      }
      statusCode = response.statusCode
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

    // TODO : Format this data set to default log view
    response.status(statusCode).send(dataSet.result)
  }
}
