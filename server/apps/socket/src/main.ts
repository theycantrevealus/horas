import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { SocketModule } from './socket.module'

async function bootstrap() {
  const app = await NestFactory.create(SocketModule, {
    logger: ['error', 'warn', 'debug'],
  })
  const configService = app.get(ConfigService)
  await app.listen(9000)
}
bootstrap()
