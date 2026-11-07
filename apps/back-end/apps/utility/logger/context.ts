import { AsyncLocalStorage } from 'node:async_hooks'
import { type ActorRef } from '@utility/history/actor'

/**
 * Data shared by every log and change record written while one request or job is processed.
 *
 * @property correlationId - Identifier that links all logs of one request across services.
 * @property actor - Who is acting: the authenticated account, or a system actor for jobs. Required for writes.
 * @property reason - Why the data is changed, set by `withChangeReason`.
 */
export interface RequestContext {
  correlationId: string
  actor?: ActorRef
  reason?: string
}

/**
 * Holds the context of the request currently being processed.
 */
const storage = new AsyncLocalStorage<RequestContext>()

/**
 * Runs `work` with `context` as the current request context.
 * Logs written by `work` and by anything it awaits carry the context's correlation identifier.
 *
 * @param context - Context to make current.
 * @param work - Code to run inside the context.
 * @returns The value returned by `work`.
 */
export function runWithRequestContext<T>(
  context: RequestContext,
  work: () => T,
): T {
  return storage.run(context, work)
}

/**
 * Reads the current request context.
 *
 * @returns The context, or `undefined` outside a request (for example during bootstrap).
 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

/**
 * Request property that stores the request context, for code that Nest runs outside the
 * interceptor's async flow, such as exception filters.
 */
const REQUEST_CONTEXT_KEY = Symbol('requestContext')

/**
 * Attaches a request context to the HTTP request object.
 *
 * @param request - Express or Fastify request.
 * @param context - Context of the request.
 */
export function attachRequestContext(
  request: object,
  context: RequestContext,
): void {
  Reflect.set(request, REQUEST_CONTEXT_KEY, context)
}

/**
 * Runs `work` inside the context attached to `request`, or directly when there is none.
 * Exception filters use it so their logs carry the request's correlation identifier.
 *
 * @param request - Express or Fastify request.
 * @param work - Code to run.
 * @returns The value returned by `work`.
 */
export function runInRequestContextOf<T>(request: unknown, work: () => T): T {
  const context: unknown =
    typeof request === 'object' && request !== null
      ? Reflect.get(request, REQUEST_CONTEXT_KEY)
      : undefined
  return isRequestContext(context)
    ? runWithRequestContext(context, work)
    : work()
}

/**
 * Checks whether a value stored on a request is a request context.
 *
 * @param value - Stored value.
 * @returns `true` when it has a string `correlationId`.
 */
function isRequestContext(value: unknown): value is RequestContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    'correlationId' in value &&
    typeof value.correlationId === 'string'
  )
}
