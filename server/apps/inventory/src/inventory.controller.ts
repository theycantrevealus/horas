import { ProceedDataTrafficDTO } from '@gateway_socket/dto/neuron'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LoggingInterceptor } from '@interceptors/logging'
import {
  Controller,
  Inject,
  OnModuleInit,
  UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Payload } from '@nestjs/microservices'
import { KafkaTopic } from '@utility/decorator'
import { GlobalResponse } from '@utility/dto/response'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Socket } from 'socket.io-client'
import { Logger } from 'winston'

import { InventoryService } from './inventory.service'

@Controller()
export class InventoryController implements OnModuleInit {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject('INVENTORY_SERVICE') private client: KafkaService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

    private readonly inventoryService: InventoryService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf(
      this.configService.get<string>('kafka.inventory.topic.purchase_order'),
      this
    )
  }

  @KafkaTopic('KAFKA_TOPICS')
  @UseInterceptors(LoggingInterceptor)
  async consumerStockMovement(
    @Payload() payload,
    headers: any,
    key: KafkaGlobalKey
  ) {
    if (key.method) {
      switch (key.method) {
        case 'stock-movement':
          await this.inventoryService
            .stokMovement({
              type: payload.type,
              stockPointOrigin: payload.stockPointOrigin,
              stockPointTarget: payload.stockPointTarget,
              item: payload.item,
              batch: payload.batch,
              qty: payload.qty,
              transaction: payload.transaction,
              transactionId: payload.transactionId,
            })
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
          break

        default:
          // Method unknown
          break
      }
    } else {
      // No method provided
    }
  }
}
