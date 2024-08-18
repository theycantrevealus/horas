import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { SharedModule } from '@shared/src/shared.module'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { SubscribeTo } from '@utility/kafka/avro/decorator'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { StockController } from './stock.controller'
import { StockModule } from './stock.module'

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SharedModule, {
    logger: ['verbose', 'error'],
  })
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.create(StockModule)

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        port: configService.get<number>('kafka.stock.port.transport'),
      },
    },
    { inheritAppConfig: true }
  )

  app.get(DecoratorProcessorService).processDecorators([
    {
      target: StockController,
      constant: KAFKA_TOPICS,
      meta: `kafka.stock.topic`,
      decorator: SubscribeTo,
    },
  ])

  appContext.useLogger(appContext.get(WINSTON_MODULE_NEST_PROVIDER))
  await app.startAllMicroservices()
  app.listen(configService.get<number>('kafka.stock.port.service'))
}
bootstrap()
