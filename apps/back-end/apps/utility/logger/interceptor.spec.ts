import { Writable } from 'node:stream'
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Logger,
  UseGuards,
} from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { RepositoryExceptionFilter } from '@utility/filter/repository'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston'
import { format, Logform, transports } from 'winston'
import { RepositoryUnavailableError } from '@utility/database/error'
import { getRequestContext } from './context'
import { requestContext, sanitize } from './format'
import { CORRELATION_HEADER, RequestLoggingInterceptor } from './interceptor'
import { LOG_LEVELS } from './level'

/**
 * Service that logs after an `await`, to check the correlation identifier survives async work.
 */
@Injectable()
class ProbeService {
  private readonly logger = new Logger(ProbeService.name)

  /**
   * Logs one entry after yielding to the event loop.
   *
   * @returns A fixed value.
   */
  async work(): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 5))
    this.logger.log({ event: 'probe', password: 'secret' })
    return 'ok'
  }
}

/**
 * Stand-in for the auth guard: puts an authenticated user on the request.
 */
@Injectable()
class FakeAuthGuard implements CanActivate {
  /**
   * Authenticates every request as one account.
   *
   * @param context - Current execution context.
   * @returns Always `true`.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>()
    request.user = { id: 'acc-1', display_name: 'HR Admin' }
    return true
  }
}

/**
 * Controller with one succeeding route and one failing with a repository error,
 * which `RepositoryExceptionFilter` maps to 503.
 */
@Controller('probe')
class ProbeController {
  /**
   * @param probe - Service that writes a log entry.
   */
  constructor(private readonly probe: ProbeService) {}

  /**
   * Succeeding route.
   *
   * @returns The service result.
   */
  @Get('ok')
  ok(): Promise<string> {
    return this.probe.work()
  }

  /**
   * Route that fails with a transient repository error.
   */
  /**
   * Route behind the auth guard that returns the actor of the request context.
   *
   * @returns The actor.
   */
  @Get('whoami')
  @UseGuards(FakeAuthGuard)
  async whoami(): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 1))
    return getRequestContext()?.actor ?? null
  }

  @Get('fail')
  fail(): never {
    throw new RepositoryUnavailableError('database unavailable', {
      operation: 'Probe.fail',
      cause: new Error('down'),
    })
  }
}

describe('RequestLoggingInterceptor', () => {
  let app: NestFastifyApplication
  const entries: Logform.TransformableInfo[] = []

  beforeAll(async () => {
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
          format: format.combine(requestContext(), sanitize()),
          transports: [new transports.Stream({ stream })],
        }),
      ],
      controllers: [ProbeController],
      providers: [
        ProbeService,
        { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
        { provide: APP_FILTER, useClass: RepositoryExceptionFilter },
      ],
    }).compile()

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      {
        bufferLogs: true,
      },
    )
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    entries.length = 0
  })

  /**
   * Waits until the access-log entry is written; it is logged when the response closes.
   *
   * @returns The access-log entry.
   */
  async function accessLog(): Promise<Logform.TransformableInfo> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const entry = entries.find((item) => item.event === 'http_request')
      if (entry) {
        return entry
      }
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    throw new Error('No access-log entry was written')
  }

  it('returns a correlation identifier and logs it on every entry of the request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/probe/ok?nik=317',
    })
    const correlationId = response.headers[CORRELATION_HEADER]
    const access = await accessLog()
    const probe = entries.find((item) => item.event === 'probe')

    expect(response.statusCode).toBe(200)
    expect(typeof correlationId).toBe('string')
    expect(probe).toMatchObject({
      correlationId,
      context: 'ProbeService',
      password: '[REDACTED]',
    })
    expect(access).toMatchObject({
      level: 'http',
      correlationId,
      operation: 'ProbeController.ok',
      method: 'GET',
      statusCode: 200,
      outcome: 'success',
    })
    expect(typeof access.durationMs).toBe('number')
    expect(JSON.stringify(access)).not.toContain('317')
  })

  it('reuses a valid incoming identifier and replaces an invalid one', async () => {
    const valid = await app.inject({
      method: 'GET',
      url: '/probe/ok',
      headers: { [CORRELATION_HEADER]: 'upstream-123' },
    })
    const invalid = await app.inject({
      method: 'GET',
      url: '/probe/ok',
      headers: { [CORRELATION_HEADER]: 'bad id\nforged' },
    })

    expect(valid.headers[CORRELATION_HEADER]).toBe('upstream-123')
    expect(invalid.headers[CORRELATION_HEADER]).not.toBe('bad id\nforged')
  })

  it('logs failures with the error name and retry flag, and links the filter log to the request', async () => {
    const response = await app.inject({ method: 'GET', url: '/probe/fail' })
    const access = await accessLog()

    expect(response.statusCode).toBe(503)
    expect(access).toMatchObject({
      level: 'error',
      statusCode: 503,
      outcome: 'failure',
      error: 'RepositoryUnavailableError',
      retryable: true,
    })
    expect(
      entries.find((item) => item.event === 'repository_error'),
    ).toMatchObject({
      correlationId: response.headers[CORRELATION_HEADER],
      retryable: true,
    })
  })

  it('puts the actor built from request.user into the request context', async () => {
    const response = await app.inject({ method: 'GET', url: '/probe/whoami' })

    expect(response.json()).toEqual({
      account_id: 'acc-1',
      display_name: 'HR Admin',
      kind: 'account',
    })
  })
})
