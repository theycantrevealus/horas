import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { ArgumentsHost, HttpStatus } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Logger } from 'winston'

export async function errorHttpHandler(
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

  let responseSet = {
    message: exception.message,
    ...exception,
    timestamp: new Date().toISOString(),
    path: request.url,
  }

  let statusCode = HttpStatus.OK

  const errorPayload = exception.message.replace('Error: ', '').trim()

  if (isJSON(errorPayload)) {
    const parseError: GlobalResponse = JSON.parse(errorPayload)
    if (isJSON(parseError.message)) {
      responseSet = {
        ...JSON.parse(parseError.message),
        timestamp: new Date().toISOString(),
        path: request.url,
      }
    } else {
      responseSet = {
        statusCode: parseError.statusCode,
        // message: `${parseError.message.substring(0, 175)}...`,
        message: `${parseError.message}`,
        transaction_classify: parseError.transaction_classify,
        transaction_id: parseError.transaction_id,
        payload: parseError.payload,
        timestamp: new Date().toISOString(),
        path: request.url,
      }
    }

    statusCode = parseError.statusCode.defaultCode
  } else {
    console.error(exception)
    responseSet = {
      statusCode: {
        defaultCode: exception['response'].statusCode,
        customCode: modCodes.Global.failed,
        classCode: 'CORE',
      },
      // message: `${exception.message.substring(0, 175)}...`,
      message: `${exception}`,
      transaction_classify: '',
      transaction_id: '',
      payload: {},
      timestamp: new Date().toISOString(),
      path: request.url,
    }

    // statusCode = HttpStatus.BAD_REQUEST
    statusCode = exception['response'].statusCode
  }

  const account: IAccountCreatedBy = request.credential
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

  if (statusCode === HttpStatus.BAD_REQUEST) {
    logger.warn(dataSet)
  } else {
    logger.error(dataSet)
  }

  response.status(statusCode).send(dataSet.result)
}
