import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryNotFoundError,
  RepositoryUnavailableError,
  RepositoryValidationError,
} from '@utility/database/error'
import { runInRequestContextOf } from '@utility/logger/context'

/**
 * HTTP status and public message for one kind of repository error.
 *
 * @property status - HTTP status code.
 * @property message - Message safe to send to clients.
 */
interface PublicError {
  status: HttpStatus
  message: string
}

/**
 * Chooses the HTTP status and public message for a repository error.
 *
 * @param error - Repository error to map.
 * @returns Status and message that reveal no internal details.
 */
function toPublicError(error: RepositoryError): PublicError {
  if (error instanceof RepositoryNotFoundError) {
    return { status: HttpStatus.NOT_FOUND, message: 'Resource not found' }
  }
  if (error instanceof RepositoryConflictError) {
    return { status: HttpStatus.CONFLICT, message: 'Resource already exists' }
  }
  if (error instanceof RepositoryValidationError) {
    return { status: HttpStatus.BAD_REQUEST, message: 'Invalid data' }
  }
  if (error instanceof RepositoryUnavailableError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Service temporarily unavailable',
    }
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  }
}

/**
 * Describes an error cause without its message, which may contain document values.
 *
 * @param cause - Original driver error.
 * @returns Name and code of the cause, when present.
 */
function describeCause(cause: unknown): Record<string, unknown> | undefined {
  if (!(cause instanceof Error)) {
    return undefined
  }
  const code = 'code' in cause ? cause.code : undefined
  return { name: cause.name, code }
}

/**
 * Turns repository errors into HTTP responses, so the data layer stays free of transport concerns.
 * Logs the failed operation, error kind and whether it is retryable, but no data values.
 */
@Catch(RepositoryError)
export class RepositoryExceptionFilter implements ExceptionFilter<RepositoryError> {
  private readonly logger = new Logger(RepositoryExceptionFilter.name)

  /**
   * @param adapterHost - HTTP adapter, so the filter works with Fastify and Express.
   */
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Logs the error with the request's correlation identifier and sends the public response.
   *
   * @param error - Repository error raised while handling the request.
   * @param host - Current execution context.
   */
  catch(error: RepositoryError, host: ArgumentsHost): void {
    const { status, message } = toPublicError(error)
    const entry = {
      event: 'repository_error',
      operation: error.operation,
      error: error.name,
      retryable: error.retryable,
      status,
      cause: describeCause(error.cause),
    }
    const http = host.switchToHttp()
    runInRequestContextOf(http.getRequest(), () => {
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(entry)
      } else {
        this.logger.warn(entry)
      }
    })

    const response: unknown = http.getResponse()
    this.adapterHost.httpAdapter.reply(
      response,
      { statusCode: status, message },
      status,
    )
  }
}
