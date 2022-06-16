import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import * as Sentry from '@sentry/node'
import { BrowserTracing } from '@sentry/tracing'
import { json } from 'body-parser'
import { SentryInterceptor } from './interceptor/sentry'
import 'dotenv/config'
declare const module: any

async function bootstrap () {
  Sentry.init({
    dsn: `${process.env.SENTRY_DSN}`,
    integrations: [
      new BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
    ],
    tracesSampleRate: 1.0,
  })

  const app = await NestFactory.create(AppModule)
  app.use(json({ limit: '5mb' }))
  app.useGlobalInterceptors(new SentryInterceptor())
  app.enableCors()

  const options = new DocumentBuilder()
    .setTitle('HORAS (Hospital Responsive Assistant System) v3.0.0')
    .setVersion('0.0.9')
    .addBearerAuth(
      { type: 'http', scheme: 'Bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .build()

  const document = SwaggerModule.createDocument(app, options)
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
    },
  })
  await app.listen(3000)
  if (module.hot) {
    module.hot.accept()
    module.hot.dispose(() => app.close())
  }
}
bootstrap()
