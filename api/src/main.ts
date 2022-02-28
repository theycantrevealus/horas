import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { BrowserTracing } from '@sentry/tracing';
import { SentryInterceptor } from './interceptor/sentry';
import 'dotenv/config';

async function bootstrap() {
  Sentry.init({
    dsn: `${process.env.SENTRY_DSN}`,
    integrations: [
      new BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],
    tracesSampleRate: 1.0,
  });

  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new SentryInterceptor());

  const options = new DocumentBuilder()
    .setTitle('SIMRS v3.0.0')
    .addTag('user')
    .setVersion('0.0.9')
    .addBearerAuth(
      { type: 'http', scheme: 'Bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
  await app.listen(3000);
}
bootstrap();
