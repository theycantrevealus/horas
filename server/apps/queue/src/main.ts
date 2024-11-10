import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MessagePattern, MicroserviceOptions } from '@nestjs/microservices'
import { Cluster } from '@utility/cluster'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { GatewayCoreModule } from '../../gateway_core/src/gateway.core.module'
import { ConsumerQueueController } from './queue.controller'
import { ConsumerQueueModule } from './queue.module'

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    GatewayCoreModule,
    {
      logger: ['error', 'verbose', 'debug', 'warn'],
    }
  )
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ConsumerQueueModule,
    {}
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

if (process.env.NODE_CLUSTER && parseInt(process.env.NODE_CLUSTER) > 0) {
  Cluster.clusterize(bootstrap)
} else {
  bootstrap()
}
