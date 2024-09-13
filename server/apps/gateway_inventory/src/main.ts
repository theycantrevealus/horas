import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter as BullFastifyAdapter } from '@bull-board/fastify'
// import * as BullFastifyAdapter from '@bull-board/fastify'
import { ClientDecoratorProcessorService } from '@decorators/kafka/client'
import * as multipart from '@fastify/multipart'
import { CommonErrorFilter } from '@filters/error'
import { OperationQueueService } from '@gateway_core/operation/queue/services/operation-queue.service'
import { VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { Client } from '@nestjs/microservices'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { GatewayPipe } from '@pipes/gateway.pipe'
import { KAFKA_CLIENTS } from '@utility/constants'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { WinstonCustomTransports } from '@utility/transport.winston'
import { Queue as QueueMQ, Worker } from 'bullmq'
import * as CopyPlugin from 'copy-webpack-plugin'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as winston from 'winston'

import { GatewayInventoryModule } from './gateway_inventory.module'

dotenv.config({
  path: environmentIdentifier,
})

async function setupBullMQProcessor(queueName, redisOptions) {
  new Worker(
    queueName,
    async (job) => {
      for (let i = 0; i <= 100; i++) {
        await job.updateProgress(i)
        await job.log(`Processing job at interval ${i}`)

        if (Math.random() * 200 < 1) throw new Error(`Random error ${i}`)
      }

      return { jobId: `This is the return value of job (${job.id})` }
    },
    { connection: redisOptions }
  )
}

const readQueuesFromEnv = () => {
  const qStr = process.env.REDIS_TOPIC
  try {
    const qs = qStr.split(',')
    return qs.map((q) => q.trim())
  } catch (e) {
    return []
  }
}

declare const module: any
async function bootstrap() {
  const protocol = parseInt(process.env.NODE_SECURE) > 0
  let fastifyAdapter
  if (protocol) {
    fastifyAdapter = new FastifyAdapter({
      logger: false,
      disableRequestLogging: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
      https: {
        ca: fs.readFileSync(path.resolve(__dirname, 'certificates/CA.pem')),
        pfx: fs.readFileSync(
          path.resolve(__dirname, 'certificates/localhost.pfx')
        ),
        // requestCert: true,
        rejectUnauthorized: true,
        key: fs.readFileSync(
          path.resolve(__dirname, 'certificates/localhost.decrypted.key')
        ),
        cert: fs.readFileSync(
          path.resolve(__dirname, 'certificates/localhost.crt')
        ),
        passphrase: process.env.CA_PASS,
      },
    })
  } else {
    fastifyAdapter = new FastifyAdapter({
      logger: false,
      disableRequestLogging: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
    })
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    GatewayInventoryModule,
    fastifyAdapter,
    {
      logger: ['verbose', 'error', 'warn'],
    }
  )

  const configService = app.get<ConfigService>(ConfigService)

  const logger = winston.createLogger({
    transports: WinstonCustomTransports[environmentName],
    levels: {
      error: 0,
      warn: 1,
      info: 2,
    },
  })

  const redisConfig = {
    connection: {
      port: configService.get<number>('redis.port'),
      host: configService.get<string>('redis.host'),
      password: configService.get<string>('redis.password'),
    },
  }

  const createQueueMQ = (name) => new QueueMQ(name, redisConfig)

  const queues = readQueuesFromEnv().map((q) => createQueueMQ(q))
  for (const q of queues) {
    await setupBullMQProcessor(q.name, redisConfig)
  }

  const bullFastifyAdapter = new BullFastifyAdapter()

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter: bullFastifyAdapter,
  })

  bullFastifyAdapter.setBasePath('/ui')
  fastifyAdapter.register(bullFastifyAdapter.registerPlugin(), {
    prefix: '/ui',
  })

  fastifyAdapter.register(require('@fastify/static'), {
    root: path.join(
      __dirname,
      configService.get<string>('application.images.core_dir')
    ),
    prefix: `/${configService.get<string>('application.images.core_prefix')}`,
  })

  await fastifyAdapter.register(multipart)

  app.useGlobalFilters(new CommonErrorFilter(logger))
  app.useGlobalPipes(new GatewayPipe())
  app.enableVersioning({
    type: VersioningType.URI,
  })
  app.enableCors()

  const options = new DocumentBuilder()
    .setTitle('HORAS')
    .setVersion('1')
    .addServer(configService.get<string>('gateway_inventory.host_port'))
    .addBearerAuth(
      {
        name: 'JWT Bearer',
        description: 'Basic JWT Beader ey{xxxxxxxx}',
        type: 'http',
        scheme: 'Bearer',
        bearerFormat: 'JWT',
        in: 'Header',
      },
      'JWT'
    )
    .build()

  const document = SwaggerModule.createDocument(app, options)

  const CaseInsensitiveFilterPlugin = function () {
    return {
      fn: {
        opsFilter: (taggedOps, phrase) => {
          return taggedOps.filter(
            (tagObj, tag) =>
              tag.toLowerCase().indexOf(phrase.toLowerCase()) !== -1
          )
        },
      },
    }
  }

  SwaggerModule.setup('swagger', app, document, {
    customCss: `
    @import url(https://fonts.googleapis.com/css?family=Handlee);
    body { padding-top: 218px !important; background: url(\'./${configService.get<string>(
      'application.images.core_prefix'
    )}/body.jpg\') no-repeat; background-attachment: fixed; background-size: cover; }
    .topbar { box-shadow: 0 -30px 30px 30px #f6f3f3 inset !important; width: 100%; margin: 0 auto; position:fixed; top: 0; left: 0; z-index: 100; background-color: #fff !important; }
    .topbar-wrapper { width:137px; height:40px; margin: 24px; background: url(\'./${configService.get<string>(
      'application.images.core_prefix'
    )}/logo.png\')no-repeat !important; background-size: contain !important; background-position: center !important; }
    .topbar-wrapper a { display: none !important; }
    .swagger-ui .topbar { background-color: #fff !important; z-index: 100; }
    .scheme-container { position: fixed; top: 80px; width: 100%; padding: 15px 0 !important; z-index: 200; box-shadow: 0 2px 4px 0 rgba(0,0,0,.15) !important; }
    .information-container { position: fixed; right: 250px; top: 0; padding: 0 !important; z-index: 100; }
    .information-container.wrapper { max-width: 800px; }
    .information-container .info { margin: 20px 0; }
    .backdrop-ux { z-index: 100 !important; } 
    .information-container .info .title { text-align: right; font-size: 15pt !important; padding: 30px 0 0 20px !important; }
    .swagger-ui .opblock-tag { color: #001a41 !important; }
    .filter-container { margin-top: 100px; position: absolute; width: 100%; top: 0; z-index: 190; }
    .swagger-ui .filter .operation-filter-input { margin: 0 !important; position: fixed; width: 800px; z-index: 200; }
    .filter-container .filter { margin-top: -67.5px; padding: 0 !important; width: 1000px !important; }
    .opblock-summary { position: relative; }
    .opblock-summary-control { position: relative; }
    .opblock-summary-control svg { position: absolute; right: 10px; }
    .swagger-ui .opblock .opblock-summary-description { position: absolute; left: 50%; }
    .swagger-ui .opblock .opblock-summary-description::before { content: '📝'; position: absolute; left: -20px; }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { padding: 10px !important; background: #001a41 !important; color: #fff !important; }
    .swagger-ui table tbody tr td { padding: 10px !important; }
    .swagger-ui table tbody tr td { font-size: 10pt !important; vertical-align: top; }
    .swagger-ui table tbody tr td p { padding: 0 !important; margin: 0 !important; }
    .swagger-ui table tbody tr:nth-child(odd) td { background: #f2f2f2; }
    .swagger-ui table tbody tr:nth-child(even) td { background: #fff; }
    .model-example .tab .tabitem button { padding: 10px !important; color: #00a2ff !important; margin: 0 10px !important; position:relative !important; }
    .tabitem button::before { position: absolute; left: -10px; content: '📎' }
    .swagger-ui table.model tr.property-row .star { margin: 10px !important; }
    .swagger-ui .markdown p, .swagger-ui .markdown pre, .swagger-ui .renderedMarkdown p, .swagger-ui .renderedMarkdown pre { padding: 10px !important; font-size: 10pt !important; }
    .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p, .swagger-ui .opblock-title_normal p { font-size: 10pt !important; font-family: monospace !important; font-weight: 600 !important; }
    .operation-tag-content { padding-bottom: 100px !important; }
    .textmode li { list-style-type: none !important; }
    .property-row td:nth-child(2) { overflow: hidden !important; }
    .property-row td:nth-child(2)::before { }
    .property-row .model .renderedMarkdown {
      font-family: 'Handlee', cursive !important;
      margin: 10px !important;
      color: mediumblue !important;
      position: relative;
      min-height: 120px !important;
      background: #fafafa !important;
      padding: 0 35px 0 70px !important;
      border-radius: 10px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,.3) !important;
      background: linear-gradient(transparent, transparent 28px, #91D1D3 28px) !important;
      background-size: 30px 30px !important;
      line-height: 30px !important;
    }

    .property-row .model .renderedMarkdown:before {
      content: '';
      position: absolute !important;
      top: 0 !important; bottom: 0 !important; left: 5px !important;
      width: 50px !important;
      background: radial-gradient(#575450 6px, transparent 7px) repeat-y !important;
      background-size: 30px 30px !important;
      border-right: 3px solid #D44147 !important;
      box-sizing: border-box !important;
    }

    .property-row .model .renderedMarkdown:after{ position: absolute; top: -5px; left: 15px; content: '📎'; font-size: 25pt !important; }

    .property-row .model .renderedMarkdown p { line-height: 30px !important; color: mediumblue !important; padding: 0 !important; font-family: 'Handlee', cursive !important; }
    .property-row .model .renderedMarkdown ol, .property-row .model .renderedMarkdown ul { margin: -.5px; font-family: 'Handlee', cursive !important; line-height: 30px !important; }
    .property-row .model .renderedMarkdown ol li, .property-row .model .renderedMarkdown ul li { height: 30px !important; }
    .property-row .model .renderedMarkdown p b { color: red !important; }
    .swagger-ui textarea { border: solid 1px #ccc !important; }
    `,
    customSiteTitle: configService.get<string>('application.name'),
    customfavIcon: `./${configService.get<string>(
      'application.images.core_prefix'
    )}/icon.png`,
    swaggerOptions: {
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      plugins: [
        CaseInsensitiveFilterPlugin,
        new CopyPlugin({
          patterns: [
            './node_modules/swagger-ui-dist/swagger-ui.css',
            './node_modules/swagger-ui-dist/swagger-ui-bundle.js',
            './node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js',
            './node_modules/swagger-ui-dist/favicon-16x16.png',
            './node_modules/swagger-ui-dist/favicon-32x32.png',
          ],
        }),
      ],
      persistAuthorization: true,
    },
  })

  const mode = configService.get<string>('application.node_env')

  app.get(ClientDecoratorProcessorService).processDecorators([
    {
      target: OperationQueueService,
      constant: KAFKA_CLIENTS,
      meta: `kafka.queue`,
      decorator: Client,
    },
  ])

  await app.listen(
    parseInt(configService.get<string>('gateway_inventory.port'))
  )

  if (mode === '' || mode === 'development') {
    if (module.hot) {
      module.hot.accept()
      module.hot.dispose(() => app.close())
    }
  }
}
bootstrap()
// Cluster.clusterize(bootstrap())
