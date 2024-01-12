import { Controller, Inject } from '@nestjs/common'
import { Payload } from '@nestjs/microservices'
import { KafkaTopic } from '@utility/decorator'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { Logger } from 'winston'

@Controller()
export class AccountController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  @KafkaTopic('KAFKA_TOPICS')
  async account(@Payload() payload) {
    this.logger.verbose(payload)
  }
}
