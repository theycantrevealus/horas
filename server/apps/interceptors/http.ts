import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { GlobalResponse, GlobalResponseParsed } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { isCustomErrorCode } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { FastifyRequest } from 'fastify'
import { tap } from 'rxjs'
import { Logger } from 'winston'

export async function httpInterceptor(
  context: ExecutionContext,
  next: CallHandler,
  reflector: Reflector,
  logger: Logger
) {
  const TM = new TimeManagement()
  const http = context.switchToHttp()
  const request = http.getRequest()
  const response = http.getResponse()
  const path = reflector.get<string[]>(PATH_METADATA, context.getHandler())
  const method = isExpressRequest(request)
    ? request.method
    : (request as FastifyRequest).method

  // const authorization = isExpressRequest(request)
  //   ? request.headers['Authorization']
  //   : (request as FastifyRequest).headers?.authorization
  const now = Date.now()
  const { url } = request
  const query = request.query ? JSON.parse(JSON.stringify(request.query)) : ''
  const account: IAccount = request.credential

  return next.handle().pipe(
    tap(async (result: GlobalResponse) => {
      const dataSet: HorasLogging = {
        ip: request.ip ?? '',
        path: path?.toString(),
        url: url,
        method: method,
        takeTime: Date.now() - now,
        payload: {
          body: request.body ?? {},
          params: request.params ?? '',
          query: query,
        },
        result: result,
        account: account,
        time: TM.getTimezone('Asia/Jakarta'),
      }

      if (result.statusCode) {
        if (result.statusCode.defaultCode === HttpStatus.BAD_REQUEST) {
          logger.warn(dataSet)
        } else if (
          result.statusCode.defaultCode === HttpStatus.INTERNAL_SERVER_ERROR
        ) {
          logger.error(dataSet)
        } else {
          logger.verbose(dataSet)
        }
      } else {
        logger.warn(dataSet)
      }

      if (result.statusCode) {
        if (isCustomErrorCode(result.statusCode)) {
          response.code(result.statusCode.defaultCode).send({
            // statusCode: `${result.statusCode.classCode}_${result.statusCode.customCode}`,
            statusCode: result.statusCode,
            message: result.message,
            payload: result.payload,
            transaction_classify: result.transaction_classify,
            transaction_id: result.transaction_id,
          } satisfies GlobalResponseParsed)
        } else {
          response.code(HttpStatus.BAD_REQUEST).send({
            statusCode: {
              classCode: `CORE`,
              customCode: `F0000`,
              defaultCode: 400,
            },
            message: result.message,
            payload: result.payload,
            transaction_classify: result.transaction_classify,
            transaction_id: result.transaction_id,
          } satisfies GlobalResponseParsed)
        }
      } else {
        response.code(HttpStatus.BAD_REQUEST).send({
          statusCode: {
            classCode: `CORE`,
            customCode: `F0000`,
            defaultCode: 400,
          },
          message: result.message,
          payload: result.payload,
          transaction_classify: 'UNKNOWN',
          transaction_id: result.transaction_id,
        } satisfies GlobalResponseParsed)
      }
    })
  )
}
