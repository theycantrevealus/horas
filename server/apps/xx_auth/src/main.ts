import { NestFactory } from '@nestjs/core';
import { XxAuthModule } from './xx_auth.module';

async function bootstrap() {
  const app = await NestFactory.create(XxAuthModule);
  await app.listen(3000);
}
bootstrap();
