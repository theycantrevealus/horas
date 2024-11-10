import { ArgumentsHost, Catch, ExceptionFilter, Inject } from '@nestjs/common'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

import { errorHttpHandler } from './http'
import { errorRpcHandler } from './rpc'

@Catch()
export class CommonErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}
  async catch(exception: GlobalResponse, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      await errorHttpHandler(exception, host, this.logger)
    } else {
      await errorRpcHandler(exception, host, this.logger)
    }
  }
}
