import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter as BullFastifyAdapter } from '@bull-board/fastify'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import {
  MicroserviceOptions,
  RedisOptions,
  Transport,
} from '@nestjs/microservices'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { SharedModule } from '@shared/src/shared.module'
import { WINSTON_MODULE_NEST_PROVIDER } from '@utility/logger/constants'
import { Queue as QueueMQ, QueueOptions, Worker } from 'bullmq'
import * as fs from 'fs'
import * as path from 'path'

import { StockProcessorModule } from './stock.processor.module'

async function setupBullMQProcessor(queueName, redisOptions: QueueOptions) {
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
    {
      ...redisOptions,
      concurrency: 100,
    }
  )
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SharedModule, {
    logger: ['verbose', 'error'],
  })
  const configService = appContext.get(ConfigService)

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

  const app = await NestFactory.create(StockProcessorModule, fastifyAdapter, {
    logger: ['verbose', 'error', 'warn'],
  })

  const connectionOption: RedisOptions =
    configService.get<string>('redis.password') !== ''
      ? {
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('redis.host'),
            port: +configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password'),
          },
        }
      : {
          transport: Transport.REDIS,
          options: {
            host: configService.get<string>('redis.host'),
            port: +configService.get<number>('redis.port'),
          },
        }

  app.connectMicroservice<MicroserviceOptions>(connectionOption, {
    inheritAppConfig: true,
  })

  appContext.useLogger(appContext.get(WINSTON_MODULE_NEST_PROVIDER))

  const redisConfig: QueueOptions = {
    connection: {
      host: configService.get<string>('redis.host'),
      port: +configService.get<number>('redis.port'),
      password: configService.get<string>('redis.password'),
    },
  }

  const readQueuesFromEnv = () => {
    const qStr = configService.get<string>('redis.topics')
    try {
      const qs = qStr?.split(',')
      return qs.map((q) => q.trim())
    } catch (e) {
      return []
    }
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

  await app.startAllMicroservices()
  app.listen(configService.get<number>('redis.clients.stock.port'))
}
bootstrap()
