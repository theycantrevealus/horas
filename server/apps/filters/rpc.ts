import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { ArgumentsHost, HttpStatus } from '@nestjs/common'
import { KafkaContext } from '@nestjs/microservices'
import { GlobalResponse } from '@utility/dto/response'
import { HorasLogging } from '@utility/logger/interfaces'
import { modCodes } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Logger } from 'winston'

export async function errorRpcHandler(
  exception: GlobalResponse,
  host: ArgumentsHost,
  logger: Logger
) {
  const TM = new TimeManagement()
  const ctx = host.switchToRpc()
  const response = ctx.getData()
  const request = ctx.getContext()
  const method = 'RPC'

  const kafkaContext = request.getArgByIndex(0) satisfies KafkaContext
  const path = kafkaContext.topic
  const partition = kafkaContext.partition
  const offset = kafkaContext.offset

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
        path: path,
      }
    } else {
      responseSet = {
        statusCode: parseError.statusCode,
        message: parseError.message,
        transaction_classify: parseError.transaction_classify,
        transaction_id: parseError.transaction_id,
        payload: parseError.payload,
        timestamp: new Date().toISOString(),
        path: path,
      }
    }

    statusCode = parseError.statusCode.defaultCode
  } else {
    responseSet = {
      statusCode: {
        defaultCode: HttpStatus.BAD_REQUEST,
        customCode: modCodes.Global.success,
        classCode: 'CORE_F0000',
      },
      message: exception.message,
      transaction_classify: '',
      transaction_id: '',
      payload: {},
      timestamp: new Date().toISOString(),
      path: path,
    }

    statusCode = HttpStatus.BAD_REQUEST
  }

  const account: IAccount = request.credential
  const dataSet: HorasLogging = {
    ip: `${path}_${partition}_${offset}`,
    path: path ?? '',
    url: `${partition}_${offset}`,
    method: method ?? '',
    takeTime: response.time,
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
}
