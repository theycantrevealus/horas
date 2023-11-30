import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MessagePattern, MicroserviceOptions } from '@nestjs/microservices'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { KafkaConn } from '@utility/kafka'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { CoreModule } from '../../core/src/core.module'
import { ConsumerQueueController } from './queue.controller'
import { ConsumerQueueModule } from './queue.module'

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(CoreModule, {
    logger: ['verbose', 'error'],
  })
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ConsumerQueueModule,
    await KafkaConn.queue[0].useFactory(configService)
  )
  app.get(DecoratorProcessorService).processDecorators([
    {
      target: ConsumerQueueController,
      constant: KAFKA_TOPICS,
      meta: `kafka.queue.topic`,
      decorator: MessagePattern,
    },
  ])
  appContext.useLogger(appContext.get(WINSTON_MODULE_NEST_PROVIDER))
  await app.listen()
}
bootstrap()
// Cluster.clusterize(bootstrap())
