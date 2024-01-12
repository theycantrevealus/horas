import { PurchaseOrderController } from '@inventory/purchase.order.controller'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MessagePattern, MicroserviceOptions } from '@nestjs/microservices'
import { KAFKA_TOPICS } from '@utility/constants'
import { DecoratorProcessorService } from '@utility/decorator'
import { KafkaConn } from '@utility/kafka'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { CoreModule } from '../../core/src/core.module'
import { InventoryModule } from './inventory.module'

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(CoreModule, {
    logger: ['verbose', 'error'],
  })
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryModule,
    await KafkaConn.inventory[0].useFactory(configService)
  )
  app.get(DecoratorProcessorService).processDecorators([
    {
      target: PurchaseOrderController,
      constant: KAFKA_TOPICS,
      meta: `kafka.inventory.topic`,
      decorator: MessagePattern,
    },
  ])
  appContext.useLogger(appContext.get(WINSTON_MODULE_NEST_PROVIDER))
  app.listen()
}
bootstrap()
