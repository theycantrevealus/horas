import { NestFactory } from '@nestjs/core';
import { MasterItemModule } from './master.item.module';

async function bootstrap() {
  const app = await NestFactory.create(MasterItemModule);
  await app.listen(3000);
}
bootstrap();
