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
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

import { AccountService } from './account.service'

@Controller()
export class AccountController implements OnModuleInit {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject('ACCOUNT_SERVICE') private client: KafkaService,

    @Inject(AccountService) private readonly accountService: AccountService,

    @Inject(SocketIoClientProxyService)
    private readonly socketProxy: SocketIoClientProxyService
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf(
      this.configService.get<string>('kafka.account.topic.account'),
      this
    )
  }

  @KafkaTopic('KAFKA_TOPICS')
  @UseInterceptors(LoggingInterceptor)
  async account(
    @Payload() payload,
    key: KafkaGlobalKey,
    offset: number,
    timestamp: string,
    partition: number,
    headers: any
  ) {
    // console.log(`Key       : ${JSON.stringify(key, null, 2)}`)
    // console.log(`Offset    : ${offset}`)
    // console.log(`Timestamp : ${timestamp}`)
    // console.log(`Partition : ${partition}`)
    // console.log(`Payload   : ${payload}`)
    // console.log(`Header    : ${JSON.stringify(headers, null, 2)}`)

    if (key.method && key.service) {
      if (key.service === 'account') {
        switch (key.method) {
          case 'create':
            await this.accountService
              .accountAdd(payload, key.id, headers)
              .then(async (response) => {
                // await socketNotifier(this.socketProxy, this.logger, {
                //   token: headers.token,
                //   ...response,
                // })
              })
              .catch((error) => {
                throw new Error(JSON.stringify(error))
              })
            break
          default:
            throw new Error('Unknown method and service')
        }
      } else {
        // For other service
      }
    } else {
      throw new Error('Unknown method and service')
    }
  }
}
