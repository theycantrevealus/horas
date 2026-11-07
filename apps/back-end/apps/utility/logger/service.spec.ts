import { Writable } from 'node:stream'
import { Inject, Injectable } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston'
import { format, Logform, transports } from 'winston'
import { sanitize } from './format'
import { LOG_LEVELS } from './level'
import { AppLogger } from './service'

/**
 * First consumer of `AppLogger`.
 */
@Injectable()
class FirstConsumer {
  /**
   * @param logger - Injected logger.
   */
  constructor(@Inject(AppLogger) readonly logger: AppLogger) {}
}

/**
 * Second consumer of `AppLogger`.
 */
@Injectable()
class SecondConsumer {
  /**
   * @param logger - Injected logger.
   */
  constructor(@Inject(AppLogger) readonly logger: AppLogger) {}
}

describe('AppLogger', () => {
  const entries: Logform.TransformableInfo[] = []

  /**
   * Builds a module with a capturing winston logger and routes Nest's logger to it.
   *
   * @returns The compiled testing module.
   */
  async function createModule() {
    const stream = new Writable({
      objectMode: true,
      write(chunk: Logform.TransformableInfo, _encoding, done) {
        entries.push(chunk)
        done()
      },
    })
    const moduleRef = await Test.createTestingModule({
      imports: [
        WinstonModule.forRoot({
          levels: LOG_LEVELS,
          level: 'silly',
          format: format.combine(sanitize()),
          transports: [new transports.Stream({ stream })],
        }),
      ],
      providers: [AppLogger, FirstConsumer, SecondConsumer],
    }).compile()
    const app = moduleRef.createNestApplication()
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
    await app.init()
    return { app, moduleRef }
  }

  beforeEach(() => {
    entries.length = 0
  })

  it('gives each consumer its own instance, named after the consumer class', async () => {
    const { app, moduleRef } = await createModule()
    const first = moduleRef.get(FirstConsumer)
    const second = moduleRef.get(SecondConsumer)

    first.logger.warn({ event: 'one' })
    second.logger.error({ event: 'two' })

    expect(first.logger).not.toBe(second.logger)
    expect(entries.find((item) => item.event === 'one')).toMatchObject({
      level: 'warn',
      context: 'FirstConsumer',
    })
    expect(entries.find((item) => item.event === 'two')).toMatchObject({
      level: 'error',
      context: 'SecondConsumer',
    })
    await app.close()
  })

  it('writes through the shared winston logger and redacts sensitive fields', async () => {
    const { app, moduleRef } = await createModule()

    moduleRef.get(FirstConsumer).logger.log({ event: 'login', password: 'p' })

    expect(entries.find((item) => item.event === 'login')).toMatchObject({
      level: 'info',
      context: 'FirstConsumer',
      password: '[REDACTED]',
    })
    await app.close()
  })
})
