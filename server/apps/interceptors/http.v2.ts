import { IAccount } from '@gateway_core/account/interface/account.create_by'
import {
  CallHandler,
  ExecutionContext,
  RequestTimeoutException,
} from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { GlobalResponse } from '@utility/dto/response'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { modCodes, modCodesCoordinator } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { FastifyRequest } from 'fastify'
import { catchError, tap, throwError, TimeoutError } from 'rxjs'
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
  const now = Date.now()
  const { url } = request
  const query = request.query ? JSON.parse(JSON.stringify(request.query)) : ''
  const account: IAccount = request.credential
  const className: string = context
    .getClass()
    .prototype.constructor.name.toString()
  const handlerName: string = context.getHandler().name.toString()

  return next.handle().pipe(
    catchError((err) => {
      if (err instanceof TimeoutError) {
        return throwError(() => new RequestTimeoutException())
      }
      return throwError(() => err)
    }),
    // timeout(10000), // RTO Configuration (rxjs)
    tap(async (result: any) => {
      const moduleCoordinator = modCodesCoordinator(className)

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

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        logger.verbose(dataSet)
      }

      response.code(moduleCoordinator.methods[handlerName].responseCode).send({
        statusCode: {
          defaultCode: moduleCoordinator.defaultResponseCode.success,
          customCode: modCodes.Global.success,
          classCode: moduleCoordinator.defaultCode,
        },
        message: moduleCoordinator.methods[handlerName].message,
        payload: result,
        transaction_classify:
          moduleCoordinator.methods[handlerName].transaction_classify,
        transaction_id: result?.id ?? '',
      } satisfies GlobalResponse)
    })
  )
}
