import { IAccountCreatedBy } from '@core/account/interface/account.create_by'
import { CallHandler, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { KafkaContext } from '@nestjs/microservices'
import { HorasLogging } from '@utility/logger/interfaces'
import { TimeManagement } from '@utility/time'
import { isJSON } from 'class-validator'
import { Logger } from 'winston'

export async function rpcInterceptor(
  context: ExecutionContext,
  next: CallHandler,
  reflector: Reflector,
  logger: Logger
) {
  const TM = new TimeManagement()
  const ctx = context.switchToRpc()
  const response = ctx.getData()
  const request = ctx.getContext()
  // const path = reflector.get<string[]>(PATH_METADATA, context.getHandler())
  const method = 'RPC'

  const kafkaContext = request.getArgByIndex(0) satisfies KafkaContext
  const path = kafkaContext.topic
  const partition = kafkaContext.partition
  const offset = kafkaContext.offset

  const now = Date.now()
  const account: IAccountCreatedBy = response.account

  const dataSet: HorasLogging = {
    ip: `${path}_${partition}_${offset}`,
    path: path ?? '',
    url: `${partition}_${offset}`,
    method: method,
    takeTime: Date.now() - now,
    payload: {
      body: response.data,
      params: response.id,
      query: response.data,
    },
    result: isJSON(response.data)
      ? JSON.stringify(response.data)
      : response.data,
    account: account,
    time: TM.getTimezone('Asia/Jakarta'),
  }

  logger.verbose(`RPC logger : ${dataSet}`)
  return next.handle()
}
