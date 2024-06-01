import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { JWTTokenDecodeResponse } from '@security/auth.dto'
import { AuthService } from '@security/auth.service'
import { isExpressRequest } from '@utility/http'
import { HorasLogging } from '@utility/logger/interfaces'
import { CustomErrorCode } from '@utility/modules'
import { TimeManagement } from '@utility/time'
import { FastifyRequest } from 'fastify'
import { Logger } from 'winston'

export async function wsInterceptor(
  context: ExecutionContext,
  next: CallHandler,
  reflector: Reflector,
  logger: Logger,
  authService: AuthService
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

  const token = request.handshake.headers.authorization.split('Bearer')[1]
  const decodeTokenResponse: JWTTokenDecodeResponse =
    await authService.validate_token({
      token: token,
    })
  const account: IAccountCreatedBy = decodeTokenResponse.account

  const dataSet: HorasLogging = {
    ip: request.ip ?? request.handshake.headers.host,
    path: path?.toString() ?? request.handshake.url,
    url: url ?? request.handshake.url,
    method: method ?? request.handshake.query.transport,
    takeTime: Date.now() - now,
    payload: {
      body: response,
      params: request.params ?? '',
      query: query,
    },
    result: response.payload,
    account: account,
    time: TM.getTimezone('Asia/Jakarta'),
  }

  const statusCode: CustomErrorCode = response.payload.statusCode
  if (statusCode.defaultCode) {
    if (statusCode.defaultCode === HttpStatus.OK) {
      logger.verbose(dataSet)
    } else {
      console.log(dataSet.payload.body.payload.message)
      throw new Error(dataSet.payload.body)
    }
  } else {
    logger.warn(dataSet)
  }

  return next.handle()
}
