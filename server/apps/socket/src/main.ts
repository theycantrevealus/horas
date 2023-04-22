import { NestFactory } from '@nestjs/core'
import { SocketIoAdapter } from '@socket/adapters/adapter'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'

import { SocketModule } from './socket.module'

async function bootstrap() {
  const app = await NestFactory.create(SocketModule, {
    logger: ['error', 'warn', 'debug', 'verbose'],
    cors: {
      origin: '*:*',
    },
  })
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  app.useWebSocketAdapter(new SocketIoAdapter(app, true))
  await app.listen(9000)
}
bootstrap()
