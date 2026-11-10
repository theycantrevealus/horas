import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { GatewayHrModule } from './gateway.hr.module'

/**
 * Bootstraps the HR API gateway. Same settings as the back-office gateway; it listens on port
 * 3001 unless `NODE_PORT` says otherwise.
 * Logs written while modules initialise go to Nest's console logger, so a hanging startup
 * (for example an unreachable database) stays visible. Once the app is created, every Nest `Logger` writes through winston.
 *
 * @returns A promise that resolves once the HTTP server is listening.
 */
async function bootstrap(): Promise<void> {
  try {
    const fastifyAdapter = new FastifyAdapter({
      logger: false,
      bodyLimit: 102457600,
      routerOptions: {
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
      },
    })

    const app = await NestFactory.create<NestFastifyApplication>(
      GatewayHrModule,
      fastifyAdapter,
      {
        bodyParser: false,
      },
    )
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    )

    app.enableVersioning({
      type: VersioningType.URI,
    })
    app.enableCors()
    await app.listen(process.env.NODE_PORT ?? 3001)
  } catch (err: unknown) {
    console.error(err)
    console.dir(err, { depth: null })
  }
}
void bootstrap()
