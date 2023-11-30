import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  HttpStatus,
  Inject,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common'
import { Payload } from '@nestjs/microservices'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { KafkaTopic } from '@utility/decorator'
import { GlobalResponse } from '@utility/dto/response'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { modCodes } from '@utility/modules'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import { CommonErrorFilter } from '../../filters/error'
import { ConsumerQueueDTO } from './dto/queue.dto'
import { ConsumerQueueService } from './queue.service'

@Controller('queue')
export class ConsumerQueueController {
  constructor(
    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject(ConsumerQueueService)
    private readonly consumerQueueService: ConsumerQueueService
  ) {}

  @KafkaTopic('KAFKA_TOPICS')
  @UseFilters(CommonErrorFilter)
  @UseInterceptors(LoggingInterceptor)
  async queue(@Payload() payload: ConsumerQueueDTO) {
    const response = {
      statusCode: {
        defaultCode: HttpStatus.OK,
        customCode: modCodes.Global.success,
        classCode: modCodes[this.constructor.name].defaultCode,
      },
      message: '',
      payload: {},
      transaction_classify: 'QUEUE',
      transaction_id: null,
    } satisfies GlobalResponse

    try {
      switch (payload.action) {
        case 'add':
          return await this.consumerQueueService
            .add(payload.id, payload.data, payload.account)
            .then(async (response) => {
              return await this.socketProxy
                .reconnect({
                  extraHeaders: {
                    Authorization: payload.token,
                  },
                })
                .then(async (clientSet: Socket) => {
                  response.message = 'New queue created'
                  return clientSet.emit(
                    'queue',
                    {
                      sender: payload.account,
                      receiver: null,
                      payload: response,
                    } satisfies ProceedDataTrafficDTO,
                    async () => {
                      await clientSet.disconnect()
                      return response
                    }
                  )
                })
            })
          break
        case 'edit':
          break
        default:
          this.logger.error(`Unknown message payload received: ${payload}`)
      }
    } catch (error) {
      response.message = error.message
      response.statusCode = {
        ...modCodes[this.constructor.name].error.databaseError,
        classCode: modCodes[this.constructor.name].defaultCode,
      }
      response.payload = error
      throw new Error(JSON.stringify(error))
    }
  }
}
