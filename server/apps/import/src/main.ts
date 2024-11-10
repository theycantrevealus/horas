import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions } from '@nestjs/microservices'

import { GatewayCoreModule } from '../../gateway_core/src/gateway.core.module'
import { ImportModule } from './import.module'

declare const module: any
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(
    GatewayCoreModule
  )
  const configService = appContext.get(ConfigService)
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ImportModule,
    // await KafkaConn.m_item[0].useFactory(configService)
    {}
  )
  app.listen()
}
bootstrap()
