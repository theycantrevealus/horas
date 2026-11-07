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
