import { RepositoryError } from '@utility/database/error'
import { type AppLogger } from '@utility/logger/service'
import { IdentityError } from './identity.error'

/**
 * Level used to log a successful operation.
 */
export type SuccessLevel = 'log' | 'debug'

/**
 * Runs an operation and writes one structured log entry about it (`logging.md` 1 and 4.2):
 * what was attempted, whether it worked, how long it took and, on failure, the error class,
 * the identity error code and whether a retry can help. It logs no payloads, identifiers of
 * people or secrets; `extra` must hold only identifiers and counts.
 * Business rejections log as `warn`, unexpected errors as `error`. The error is rethrown unchanged.
 *
 * @param logger - Logger of the calling class.
 * @param event - Stable snake_case event name, for example `login`.
 * @param operation - Operation as `Class.method`.
 * @param work - The operation.
 * @param successLevel - Level for the success entry.
 * @returns What `work` returns.
 */
export async function observe<T>(
  logger: AppLogger,
  event: string,
  operation: string,
  work: () => Promise<T>,
  successLevel: SuccessLevel = 'debug',
): Promise<T> {
  const startedAt = performance.now()
  try {
    const result = await work()
    logger[successLevel]({
      event,
      operation,
      outcome: 'success',
      durationMs: Math.round(performance.now() - startedAt),
    })
    return result
  } catch (error: unknown) {
    const entry = {
      event,
      operation,
      outcome: 'failure',
      error: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof IdentityError ? error.code : undefined,
      retryable: error instanceof RepositoryError && error.retryable,
      durationMs: Math.round(performance.now() - startedAt),
    }
    if (error instanceof IdentityError) {
      logger.warn(entry)
    } else {
      logger.error(entry)
    }
    throw error
  }
}
