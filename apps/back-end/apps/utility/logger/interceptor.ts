import { randomUUID } from 'node:crypto'
import { ServerResponse } from 'node:http'
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { Observable, tap } from 'rxjs'
import { toActorRef } from '@utility/history/actor'
import {
  attachRequestContext,
  RequestContext,
  runWithRequestContext,
} from './context'
import { LogLevelName } from './level'

/**
 * Header that carries the correlation identifier between services and back to the client.
 */
export const CORRELATION_HEADER = 'x-request-id'

/**
 * Accepted shape of an incoming correlation identifier. Anything else is replaced,
 * so clients cannot inject arbitrary text into logs.
 */
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/

/**
 * Request fields the interceptor reads. Express and Fastify requests both provide them.
 *
 * @property method - HTTP method.
 * @property ip - Client address.
 * @property headers - Request headers.
 * @property user - Authenticated account, set by an auth guard when present.
 */
interface HttpRequestLike {
  method?: string
  ip?: string
  headers?: Record<string, string | string[] | undefined>
  user?: unknown
}

/**
 * Access-log entry written once per HTTP request. It holds no payload, result,
 * query string or path parameters, which may contain patient data.
 *
 * @property event - Always `http_request`.
 * @property operation - Handler that processed the request, as `Controller.method`.
 * @property method - HTTP method.
 * @property statusCode - Status code sent to the client.
 * @property outcome - `success`, `failure`, or `aborted` when the client disconnected first.
 * @property durationMs - Time from the interceptor to the end of the response.
 * @property ip - Client address.
 * @property accountId - Authenticated account identifier, when known.
 * @property error - Name of the error thrown by the handler, when any.
 * @property retryable - Whether that error is transient, when it says so.
 */
export interface RequestLogEntry {
  event: 'http_request'
  operation: string
  method: string
  statusCode: number
  outcome: 'success' | 'failure' | 'aborted'
  durationMs: number
  ip?: string
  accountId?: string
  error?: string
  retryable?: boolean
}

/**
 * Name and retry flag of an error thrown by a handler.
 *
 * @property name - Error class name.
 * @property retryable - Retry flag, for errors such as `RepositoryError` that have one.
 */
interface ErrorSummary {
  name: string
  retryable?: boolean
}

/**
 * Reads the correlation identifier sent by the caller, or creates a new one.
 *
 * @param request - Incoming request.
 * @returns A safe correlation identifier.
 */
function resolveCorrelationId(request: HttpRequestLike): string {
  const header = request.headers?.[CORRELATION_HEADER]
  const value = Array.isArray(header) ? header[0] : header
  return value && CORRELATION_ID_PATTERN.test(value) ? value : randomUUID()
}

/**
 * Reads the account identifier set by an authentication guard.
 *
 * @param user - `request.user`.
 * @returns The identifier, when the user object has a string `id`.
 */
function readAccountId(user: unknown): string | undefined {
  if (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    typeof user.id === 'string'
  ) {
    return user.id
  }
  return undefined
}

/**
 * Finds the Node response behind an Express or Fastify response object.
 *
 * @param response - Response from the execution context.
 * @returns The Node response, or `undefined` when there is none.
 */
function toServerResponse(response: unknown): ServerResponse | undefined {
  if (response instanceof ServerResponse) {
    return response
  }
  if (typeof response === 'object' && response !== null && 'raw' in response) {
    return response.raw instanceof ServerResponse ? response.raw : undefined
  }
  return undefined
}

/**
 * Describes an error without its message, which may contain data values.
 *
 * @param error - Error thrown by the handler.
 * @returns Its name and retry flag.
 */
function summarizeError(error: unknown): ErrorSummary {
  if (!(error instanceof Error)) {
    return { name: 'UnknownError' }
  }
  const retryable =
    'retryable' in error && typeof error.retryable === 'boolean'
      ? error.retryable
      : undefined
  return { name: error.name, retryable }
}

/**
 * Chooses the level of an access-log entry.
 *
 * @param entry - Entry to log.
 * @returns `error` for server errors, `warn` for client errors and aborts, otherwise `http`.
 */
function levelOf(entry: RequestLogEntry): LogLevelName {
  if (entry.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return 'error'
  }
  if (
    entry.outcome === 'aborted' ||
    entry.statusCode >= HttpStatus.BAD_REQUEST
  ) {
    return 'warn'
  }
  return 'http'
}

/**
 * Runs each request inside a request context with a correlation identifier and the actor
 * built from `request.user` (set by the auth guard, which runs first), returns the
 * identifier in the `x-request-id` header, and writes one access-log entry when the response ends.
 * Logging on response end means the status set by exception filters is the one recorded.
 * The context is also attached to the request, so exception filters can restore it with
 * `runInRequestContextOf`. Guards and pipes run before interceptors, so their logs have no correlation identifier.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpRequest')

  /**
   * @param adapterHost - HTTP adapter, so the interceptor works with Fastify and Express.
   */
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Wraps the handler in a request context and schedules the access log.
   *
   * @param context - Current execution context.
   * @param next - Handler of the request.
   * @returns The handler's result stream, run inside the request context.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return this.runInContext({ correlationId: randomUUID() }, next)
    }

    const http = context.switchToHttp()
    const request = http.getRequest<HttpRequestLike>()
    const response: unknown = http.getResponse()
    const correlationId = resolveCorrelationId(request)
    const operation = `${context.getClass().name}.${context.getHandler().name}`
    const startedAt = performance.now()
    let failure: ErrorSummary | undefined

    /**
     * Writes the access-log entry with the level matching its outcome.
     *
     * @param entry - Entry to write.
     */
    const logEntry = (entry: RequestLogEntry): void => {
      const level = levelOf(entry)
      if (level === 'error') {
        this.logger.error(entry)
      } else if (level === 'warn') {
        this.logger.warn(entry)
      } else {
        this.logger.log({ ...entry, level })
      }
    }

    const actor = toActorRef(request.user)
    const requestContext: RequestContext = actor
      ? { correlationId, actor }
      : { correlationId }
    attachRequestContext(request, requestContext)
    this.adapterHost.httpAdapter.setHeader(
      response,
      CORRELATION_HEADER,
      correlationId,
    )
    const serverResponse = toServerResponse(response)
    let finished = false
    serverResponse?.once('finish', () => {
      finished = true
    })
    serverResponse?.once('close', () => {
      const entry: RequestLogEntry = {
        event: 'http_request',
        operation,
        method: request.method ?? 'UNKNOWN',
        statusCode: serverResponse.statusCode,
        outcome: !finished
          ? 'aborted'
          : serverResponse.statusCode >= HttpStatus.BAD_REQUEST
            ? 'failure'
            : 'success',
        durationMs: Math.round(performance.now() - startedAt),
        ip: request.ip,
        accountId: readAccountId(request.user),
        error: failure?.name,
        retryable: failure?.retryable,
      }
      runWithRequestContext(requestContext, () => logEntry(entry))
    })

    return this.runInContext(requestContext, next).pipe(
      tap({
        error: (error: unknown) => {
          failure = summarizeError(error)
        },
      }),
    )
  }

  /**
   * Subscribes to the handler inside a request context, so the handler and everything it
   * awaits see the correlation identifier and the actor.
   *
   * @param requestContext - Context of the request.
   * @param next - Handler of the request.
   * @returns The handler's result stream.
   */
  private runInContext(
    requestContext: RequestContext,
    next: CallHandler,
  ): Observable<unknown> {
    return new Observable((subscriber) =>
      runWithRequestContext(requestContext, () =>
        next.handle().subscribe(subscriber),
      ),
    )
  }
}
