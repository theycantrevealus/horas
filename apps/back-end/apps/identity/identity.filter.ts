import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { runInRequestContextOf } from '@utility/logger/context'
import { AppLogger } from '@utility/logger/service'
import { IdentityError, type IdentityErrorKind } from './identity.error'

/**
 * HTTP status of each kind of identity error.
 */
const STATUS_BY_KIND: Readonly<Record<IdentityErrorKind, HttpStatus>> = {
  unauthenticated: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
}

/**
 * HTTP methods that only read data.
 */
const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

/**
 * Checks whether a request only reads data.
 *
 * @param request - HTTP request of the execution context.
 * @returns `true` for `GET` and `HEAD`.
 */
function isReadRequest(request: unknown): boolean {
  if (typeof request !== 'object' || request === null) {
    return false
  }
  const method: unknown = Reflect.get(request, 'method')
  return typeof method === 'string' && READ_METHODS.has(method.toUpperCase())
}

/**
 * Turns identity errors into HTTP responses, so the services stay free of transport concerns.
 * The body holds the status, the stable `code` and the fixed public message. 401 responses
 * carry `WWW-Authenticate: Bearer`. The log entry holds the kind and code, never values.
 * A record that is not found by a read request is not logged: reading data writes no log
 * entry (`logging.md` 4.3). Authentication and permission rejections are always logged,
 * whatever the method, because they are security signals, not data reads.
 */
@Catch(IdentityError)
export class IdentityExceptionFilter implements ExceptionFilter<IdentityError> {
  /**
   * @param adapterHost - HTTP adapter, so the filter works with Fastify and Express.
   * @param logger - Logger whose context is this class's name.
   */
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Logs the rejection with the request's correlation identifier and sends the public response.
   *
   * @param error - Rejection raised while handling the request.
   * @param host - Current execution context.
   */
  catch(error: IdentityError, host: ArgumentsHost): void {
    const status = STATUS_BY_KIND[error.kind]
    const http = host.switchToHttp()
    const request: unknown = http.getRequest()
    if (!(error.kind === 'not_found' && isReadRequest(request))) {
      runInRequestContextOf(request, () =>
        this.logger.warn({
          event: 'identity_rejection',
          kind: error.kind,
          code: error.code,
          status,
        }),
      )
    }

    const response: unknown = http.getResponse()
    if (status === HttpStatus.UNAUTHORIZED) {
      this.adapterHost.httpAdapter.setHeader(
        response,
        'WWW-Authenticate',
        'Bearer',
      )
    }
    this.adapterHost.httpAdapter.reply(
      response,
      { statusCode: status, code: error.code, message: error.message },
      status,
    )
  }
}
