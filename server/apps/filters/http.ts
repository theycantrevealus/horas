import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ArgumentsHost, HttpStatus } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { hasSameKeys } from '@utility/filter'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Logger } from 'winston'

export async function errorHttpHandler(
  exception: any,
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

  let responseSet: GlobalResponse = {
    statusCode: {
      defaultCode: HttpStatus.INTERNAL_SERVER_ERROR,
      customCode: modCodes.Global.failed,
      classCode: 'CORE',
    },
    message: exception,
    // message: `${exception.message.substring(0, 175)}...`,
    transaction_classify: 'CORE',
    transaction_id: '',
    payload: {},
  }

  const errorPayload = exception.message.replace('Error: ', '').trim()
  if (isJSON(errorPayload)) {
    const errorParsed = JSON.parse(errorPayload)
    if (hasSameKeys(errorParsed, responseSet)) {
      responseSet = errorParsed
    } else {
      responseSet.payload = errorParsed
    }
  } else {
    switch (exception.constructor.name) {
      case 'MongoServerError':
        responseSet.statusCode.defaultCode =
          modCodes.Global.error.databaseError.defaultCode
        responseSet.statusCode.customCode =
          exception.errorResponse.code.toString()
        responseSet.message = exception.errorResponse.errmsg

        break

      case 'NotFoundException':
        responseSet.statusCode.defaultCode =
          modCodes.Global.error.isNotFound.defaultCode
        responseSet.statusCode.customCode = '404'
        responseSet.message = 'Data is not found'
        break

      default:
        responseSet.statusCode.defaultCode =
          modCodes.Global.error.generalError.defaultCode
        responseSet.statusCode.customCode = '500'
        responseSet.message = exception.message
        responseSet.payload = {
          stack: exception.stack,
        }
    }
  }

  const account: IAccount = request.credential
  const dataSet: HorasLogging = {
    ip: request.ip ?? '',
    path: request.url ?? '',
    url: request.url ?? '',
    method: method ?? '',
    takeTime: response.elapsedTime,
    payload: {
      body: request.body ?? {},
      params: request.params ?? '',
      query: request.query ?? '',
    },
    result: responseSet,
    account: account,
    time: TM.getTimezone('Asia/Jakarta'),
  }

  if (
    responseSet.statusCode.defaultCode === HttpStatus.BAD_REQUEST ||
    responseSet.statusCode.defaultCode === HttpStatus.NOT_FOUND ||
    responseSet.statusCode.defaultCode === HttpStatus.FORBIDDEN
  ) {
    logger.warn(dataSet)
  } else {
    logger.error(dataSet)
  }

  response.status(responseSet.statusCode.defaultCode).send(responseSet)
}
