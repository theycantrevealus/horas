import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { FastifyRequest } from 'fastify'
import { Logger } from 'winston'

export async function wsInterceptor(
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
  const account: IAccountCreatedBy = request.credential

  const dataSet: HorasLogging = {
    ip: request.ip ?? request.handshake.headers.host,
    path: path?.toString() ?? request.handshake.url,
    url: url ?? request.handshake.url,
    method: method ?? request.handshake.query.transport,
    takeTime: Date.now() - now,
    payload: {
      body: request.body ?? {},
      params: request.params ?? '',
      query: query,
    },
    result: JSON.stringify(request.body),
    account: account,
    time: TM.getTimezone('Asia/Jakarta'),
  }

  // console.log('Request')
  // console.log(request)
  // console.log()
  // console.log('Response')
  // console.log(JSON.stringify(response, null, 2))

  // console.log(JSON.stringify(dataSet, null, 2))
  logger.verbose(dataSet)

  return next.handle()
}
