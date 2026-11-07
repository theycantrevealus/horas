import { NestFactory } from '@nestjs/core'
import { GatewayBackOfficeModule } from './gateway.back.office.module'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
/**
 * Bootstraps the HTTP API gateway, the public entry point of the platform.
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
      GatewayBackOfficeModule,
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
    await app.listen(process.env.NODE_PORT ?? 3000)
  } catch (err: any) {
    console.error(err)
    console.dir(err, { depth: null })
  }
}
void bootstrap()
