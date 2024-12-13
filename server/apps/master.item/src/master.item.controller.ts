import { AccountAddDTO } from '@gateway_core/account/dto/account.dto'
import { IAccount } from '@gateway_core/account/interface/account.create_by'
import { LoggingInterceptor } from '@interceptors/logging'
import { Controller, Inject, UseInterceptors } from '@nestjs/common'
import { Payload } from '@nestjs/microservices'
import { KafkaTopic } from '@utility/decorator'
import { KafkaGlobalKey } from '@utility/kafka/avro/schema/global/key'
import { KafkaService } from '@utility/kafka/avro/service'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

import { MasterItemService } from './master.item.service'

@Controller()
export class MasterItemController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,

    @Inject('ACCOUNT_SERVICE') private client: KafkaService,

    @Inject(MasterItemService)
    private readonly masterItemService: MasterItemService
  ) {}

  onModuleInit(): void {
    this.client.subscribeToResponseOf('account', this)
  }

  @KafkaTopic('KAFKA_TOPICS')
  @UseInterceptors(LoggingInterceptor)
  async account(
    @Payload() payload: AccountAddDTO,
    key: KafkaGlobalKey,
    offset: number,
    timestamp: string,
    partition: number,
    headers: IAccount
  ) {
    // await this.masterItemService
    //   .create(payload, key.id, headers)
    //   .catch((error) => {
    //     throw new Error(JSON.stringify(error))
    //   })
  }
}
