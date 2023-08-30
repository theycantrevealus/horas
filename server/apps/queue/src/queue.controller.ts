import { Controller, Inject } from '@nestjs/common'
import { Payload } from '@nestjs/microservices'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { KafkaTopic } from '@utility/decorator'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

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
  async queue(@Payload() payload) {
    switch (payload.action) {
      case 'add':
        await this.consumerQueueService
          .add(payload.id, payload.data, payload.account)
          .then(async (response) => {
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: payload.token,
                },
              })
              .then(async (clientSet) => {
                response.message = 'New queue created'
                await clientSet
                  .emit('queue', {
                    sender: payload.account,
                    receiver: null,
                    payload: response,
                  } satisfies ProceedDataTrafficDTO)
                  .then(() => {
                    clientSet.disconnect()
                  })
              })
              .catch((e: Error) => {
                this.logger.warn(`Failed to connect: ${e.message}`)
              })
          })
          .catch((e: Error) => {
            this.logger.warn(e)
          })
        break
      default:
        this.logger.error(`Unknown message payload received: ${payload}`)
    }
  }
}
