import { Controller, Inject } from '@nestjs/common'
import { Payload } from '@nestjs/microservices'
import { KafkaTopic } from '@utility/decorator'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

import { AccountService } from './account.service'

@Controller()
export class AccountController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject('ACCOUNT_SERVICE') private client: KafkaService,

    @Inject(AccountService) private readonly accountService: AccountService
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf('account', this)
  }

  @KafkaTopic('KAFKA_TOPICS')
  async account(@Payload() payload, key: any) {
    // console.log(
    //   '==================== [MODULE] Received message ===================='
    // )
    // console.log(`Key     : ${key}`)
    // console.log(`Payload : ${JSON.stringify(payload, null, 2)}`)
    // console.log(
    //   '==================== [MODULE] Received message ===================='
    // )
    // await this.accountService.create(payload)
  }
}
