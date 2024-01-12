import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fs from 'fs'
import path from 'path'

import { SharedModule } from './shared.module'

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
    SharedModule,
    fastifyAdapter,
    {
      logger: ['verbose', 'error', 'warn'],
    }
  )
  await app.listen(3000)
}
bootstrap()
