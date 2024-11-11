import { IAccountCreatedBy } from '@gateway_core/account/interface/account.create_by'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  Inject,
  OnModuleInit,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Payload } from '@nestjs/microservices'
import { ProceedDataTrafficDTO } from '@socket/dto/neuron'
import { SocketIoClientProxyService } from '@socket/socket.proxy'
import { StockService } from '@stock/stock.service'
import { KafkaTopic } from '@utility/decorator'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

@Controller()
export class StockController implements OnModuleInit {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    @Inject('STOCK_SERVICE') private readonly client: KafkaService,

    @Inject(StockService) private readonly stockService: StockService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf(
      this.configService.get<string>('kafka.stock.topic.stock'),
      this
    )
  }

  @KafkaTopic('KAFKA_TOPICS')
  @UseInterceptors(LoggingInterceptor)
  async stock(
    @Payload() payload,
    key: KafkaGlobalKey,
    // offset: string,
    // timestamp: string,
    // partition: number,
    headers: any
    // consumer: Consumer
  ) {
    try {
      const account: IAccountCreatedBy = headers
      if (key.method === 'stock_movement') {
        await this.stockService
          .stock_movement(payload, account)
          .then(async (response: GlobalResponse) => {
            await this.socketProxy
              .reconnect({
                extraHeaders: {
                  Authorization: `Bearer ${headers.token}`,
                },
              })
              .then(async (clientSet: Socket) => {
                // response.message = 'New purchase order created'
                clientSet.emit('proceed', {
                  sender: payload.account,
                  receiver: null,
                  payload: response,
                } satisfies ProceedDataTrafficDTO)
                // await clientSet.disconnect()
              })
              .catch((e: Error) => {
                this.logger.error(`Failed to connect: ${e}]`)
              })
          })
      } else {
        await this.logger.warn(`Unknown request action : ${key.method}`)
      }
    } catch (errorProcess) {
      await this.logger.error(payload)
    }
  }
}
