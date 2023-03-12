import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'

import { InventoryModule } from './inventory.module'

declare const module: any
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: { brokers: ['localhost:9092'] },
        consumer: {
          groupId: 'HRS_INVENTORY',
          allowAutoTopicCreation: true,
        },
      },
    }
  )
  app.listen()
}
bootstrap()
