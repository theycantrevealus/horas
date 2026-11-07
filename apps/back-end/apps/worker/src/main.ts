import { NestFactory } from '@nestjs/core'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { WorkerModule } from './worker.module'

/**
 * Default HTTP port for the worker when `WORKER_PORT` is not provided.
 * Differs from the gateway's default so both can run on one machine.
 */
const DEFAULT_PORT = 3001

/**
 * Bootstraps the worker service.
 *
 * The worker is a plain HTTP application for now; its message transport
 * (e.g. Kafka or gRPC) will be configured when asynchronous flows are defined.
 *
 * @returns A promise that resolves once the server is listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule)
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
  app.enableShutdownHooks()
  await app.listen(process.env.WORKER_PORT ?? DEFAULT_PORT)
}
bootstrap().catch((error: unknown) => {
  console.error('Worker failed to start', error)
  process.exit(1)
})
