import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  Sentry.init({
    dsn: 'https://8be7a2e2c31d4ba7bc61104173c05f8f@o970117.ingest.sentry.io/6234868',
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
