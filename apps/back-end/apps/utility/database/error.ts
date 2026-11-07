/**
 * Context attached to every repository error.
 *
 * @property operation - Operation that failed, for example `LovRepository.create`.
 * @property cause - Original driver error, kept for logs only and never sent to clients.
 */
export interface RepositoryErrorOptions {
  operation: string
  cause?: unknown
}

/**
 * Base class for errors raised by repositories and transaction managers.
 * Used directly, it means an unexpected data-layer defect.
 * Engine implementations translate driver errors into these classes, so business code never sees driver errors.
 */
export class RepositoryError extends Error {
  readonly operation: string
  readonly retryable: boolean = false

  /**
   * @param message - Description without data values, safe to log.
   * @param options - Failed operation and original error.
   */
  constructor(message: string, options: RepositoryErrorOptions) {
    super(message, { cause: options.cause })
    this.name = new.target.name
    this.operation = options.operation
  }
}

/**
 * Checks whether a repository operation only reads data.
 * By the repository contract (`database.md` 5.1 and 4.2) every read is named `find*`
 * (`findAll`, `findOne`, `findByGroup`, ...) and every write has another name, so the method
 * part of `operation` (`LovRepository.findAll`) is enough to tell them apart. Reads are never
 * logged (`logging.md` 4.3).
 *
 * @param operation - Operation as `Class.method`, for example `LovRepository.findAll`.
 * @returns `true` when the method is a read.
 */
export function isReadOperation(operation: string): boolean {
  const method = operation.slice(operation.lastIndexOf('.') + 1)
  return /^find[A-Z]/.test(method)
}

/**
 * The requested record does not exist or is soft-deleted.
 */
export class RepositoryNotFoundError extends RepositoryError {}

/**
 * The write breaks a uniqueness rule, for example a duplicate key.
 */
export class RepositoryConflictError extends RepositoryError {}

/**
 * The data or identifier was rejected by the storage rules.
 */
export class RepositoryValidationError extends RepositoryError {}

/**
 * The database could not be reached or the operation hit a transient failure. Retrying may succeed.
 */
export class RepositoryUnavailableError extends RepositoryError {
  override readonly retryable = true
}
