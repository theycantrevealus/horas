import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MessagePattern, MicroserviceOptions } from '@nestjs/microservices'
import { SharedModule } from '@shared/src/shared.module'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { KafkaConn } from '@utility/kafka'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { AccountController } from './account.controller'
import { AccountModule } from './account.module'

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SharedModule, {
    logger: ['verbose', 'error'],
  })
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AccountModule,
    await KafkaConn.account[0].useFactory(configService)
  )
  app.get(DecoratorProcessorService).processDecorators([
    {
      target: AccountController,
      constant: KAFKA_TOPICS,
      meta: `kafka.account.topic`,
      decorator: MessagePattern,
    },
  ])

  appContext.useLogger(appContext.get(WINSTON_MODULE_NEST_PROVIDER))
  app.listen()
}
bootstrap()
