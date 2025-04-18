import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { Controller, Inject, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Payload } from '@nestjs/microservices'
import { KafkaTopic } from '@utility/decorator'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Consumer } from 'kafkajs'
import { Logger } from 'winston'

import { ConsumerStockService } from './consumer_stock.service'

@Controller()
export class ConsumerStockController implements OnModuleInit {
  constructor(
    @Inject(ConsumerStockService)
    private readonly consumerStockService: ConsumerStockService,

    @Inject(ConfigService)
    private readonly configService: ConfigService,

    @Inject('STOCK_SERVICE') private client: KafkaService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService,

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
  async stock(
    @Payload() payload: any,
    key: KafkaGlobalKey,
    offset: string,
    timestamp: string,
    partition: number,
    topic: string,
    consumer: Consumer,
    headers: any
  ) {
    // console.log(`Topic     : ${topic}`)
    // console.log(`Key       : ${JSON.stringify(key, null, 2)}`)
    // console.log(`Offset    : ${offset}`)
    // console.log(`Timestamp : ${timestamp}`)
    // console.log(`Partition : ${partition}`)
    // console.log(`Payload   : ${JSON.stringify(payload, null, 2)}`)
    // console.log(`Header    : ${JSON.stringify(headers, null, 2)}`)

    switch (key.method) {
      case 'stock_movement':
        await this.consumerStockService.movement(payload, headers)
        break
      case 'stock_adjustment':
        await this.consumerStockService.movement(payload, headers, 'adjustment')
        break
      default:
    }
  }
}
