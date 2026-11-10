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
import { WorkforceError, type WorkforceErrorKind } from './workforce.error'

/**
 * HTTP status for each kind of workforce error.
 */
const STATUS_BY_KIND: Readonly<Record<WorkforceErrorKind, HttpStatus>> = {
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  invalid: HttpStatus.UNPROCESSABLE_ENTITY,
}

/**
 * Methods that only read data.
 */
const READ_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD'])

/**
 * Tells whether a request only reads data.
 *
 * @param request - The HTTP request, as Nest hands it over.
 * @returns True for GET and HEAD requests.
 */
function isReadRequest(request: unknown): boolean {
  if (typeof request !== 'object' || request === null) {
    return false
  }
  const method: unknown = Reflect.get(request, 'method')
  return typeof method === 'string' && READ_METHODS.has(method.toUpperCase())
}

/**
 * Turns workforce business rejections into HTTP responses and logs them. A record that a read
 * request did not find is answered but not logged (`logging.md` 4.3); the access log still
 * records the status.
 */
@Catch(WorkforceError)
export class WorkforceExceptionFilter implements ExceptionFilter<WorkforceError> {
  /**
   * @param adapterHost - Gives access to the HTTP adapter that writes the response.
   * @param logger - Logger of this filter.
   */
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Answers the request with the status of the error kind.
   *
   * @param error - The rejection.
   * @param host - The execution context of the failed request.
   */
  catch(error: WorkforceError, host: ArgumentsHost): void {
    const status = STATUS_BY_KIND[error.kind]
    const http = host.switchToHttp()
    const request: unknown = http.getRequest()
    if (!(error.kind === 'not_found' && isReadRequest(request))) {
      runInRequestContextOf(request, () =>
        this.logger.warn({
          event: 'workforce_rejection',
          kind: error.kind,
          code: error.code,
          status,
        }),
      )
    }

    this.adapterHost.httpAdapter.reply(
      http.getResponse(),
      { statusCode: status, code: error.code, message: error.message },
      status,
    )
  }
}
