import { NestFactory } from '@nestjs/core';
import { Processor/masterModule } from './processor/master.module';

async function bootstrap() {
  const app = await NestFactory.create(Processor/masterModule);
  await app.listen(3000);
}
bootstrap();
