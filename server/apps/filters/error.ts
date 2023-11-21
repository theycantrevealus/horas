import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Logger } from 'winston'

export async function errorHandler(
  exception: GlobalResponse,
  host: ArgumentsHost,
  logger: Logger
) {
  const TM = new TimeManagement()
  const ctx = host.switchToHttp()
  const response = ctx.getResponse<FastifyReply>()
  const request = ctx.getRequest()
  const method = isExpressRequest(request)
    ? request.method
    : (request as FastifyRequest).method

  const responseSet = {
    ...exception,
    timestamp: new Date().toISOString(),
    path: request.url,
  }
  const statusCode = exception.statusCode.defaultCode

  // const errorPayload = exception.message.replace('Error: ', '').trim()
  // if (isJSON(errorPayload)) {
  //   const parseError: GlobalResponse = JSON.parse(errorPayload)
  //   responseSet = {
  //     ...JSON.parse(parseError.message),
  //     timestamp: new Date().toISOString(),
  //     path: request.url,
  //   }
  //   statusCode = parseError.statusCode.defaultCode
  // } else {
  //   responseSet = {
  //     code: response.statusCode,
  //     message: exception.message,
  //     description: exception.stack ?? '',
  //     timestamp: new Date().toISOString(),
  //     path: request.url,
  //   }
  //   statusCode = response.statusCode
  // }

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

  if (exception.statusCode.defaultCode === HttpStatus.BAD_REQUEST) {
    logger.warn(dataSet.result)
  } else {
    logger.error(dataSet.result)
  }

  response.status(statusCode).send(dataSet.result)
}

@Catch()
export class CommonErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
  async catch(exception: GlobalResponse, host: ArgumentsHost) {
    await errorHandler(exception, host, this.logger)
  }
}
