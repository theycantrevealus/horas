import { RepositoryError } from '@utility/database/error'
import { type AppLogger } from '@utility/logger/service'
import { WorkforceError } from './workforce.error'

/**
 * Level used to log a successful operation.
 */
export type SuccessLevel = 'log' | 'debug'

/**
 * Runs a write operation and writes one structured log entry about it (`logging.md` 1 and 4.2):
 * what was attempted, whether it worked, how long it took and, on failure, the error class,
 * the workforce error code and whether a retry can help. It logs no payloads, personal data or
 * secrets. Business rejections log as `warn`, unexpected errors as `error`. The error is
 * rethrown unchanged. Never use it around a read (`logging.md` 4.3).
 *
 * @param logger - Logger of the calling class.
 * @param event - Stable snake_case event name, for example `organization_create`.
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
  successLevel: SuccessLevel = 'log',
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
      code: error instanceof WorkforceError ? error.code : undefined,
      retryable: error instanceof RepositoryError && error.retryable,
      durationMs: Math.round(performance.now() - startedAt),
    }
    if (error instanceof WorkforceError) {
      logger.warn(entry)
    } else {
      logger.error(entry)
    }
    throw error
  }
}
