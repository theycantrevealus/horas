import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions } from '@nestjs/microservices'

import { CoreModule } from '../../core/src/core.module'
import { ImportModule } from './import.module'

declare const module: any
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(CoreModule)
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ImportModule,
    // await KafkaConn.m_item[0].useFactory(configService)
    {}
  )
  app.listen()
}
bootstrap()
