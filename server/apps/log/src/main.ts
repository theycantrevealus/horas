import { NestFactory } from '@nestjs/core'

import { LogModule } from './log.module'

async function bootstrap() {
  const app = await NestFactory.create(LogModule)
  await app.listen(3000)
}
bootstrap()
