import { Error as MongooseError, mongo } from 'mongoose'
import {
  RepositoryConflictError,
  RepositoryError,
  RepositoryUnavailableError,
  RepositoryValidationError,
} from './error'

/**
 * MongoDB error code for a duplicate key on a unique index.
 */
const DUPLICATE_KEY_CODE = 11000

/**
 * Driver error labels that mark a failure as transient.
 */
const TRANSIENT_LABELS = ['TransientTransactionError', 'RetryableWriteError']

/**
 * Checks whether an error means the database is unreachable or failed transiently.
 *
 * @param error - Error raised by Mongoose or the driver.
 * @returns `true` when retrying may succeed.
 */
function isUnavailable(error: unknown): boolean {
  if (
    error instanceof mongo.MongoNetworkError ||
    error instanceof mongo.MongoServerSelectionError ||
    error instanceof mongo.MongoNotConnectedError ||
    error instanceof MongooseError.MongooseServerSelectionError
  ) {
    return true
  }
  if (error instanceof mongo.MongoError) {
    return TRANSIENT_LABELS.some((label) => error.hasErrorLabel(label))
  }
  // Mongoose raises a plain MongooseError when a query waits too long for a connection.
  return (
    error instanceof MongooseError &&
    error.message.includes('buffering timed out')
  )
}

/**
 * Translates a Mongoose or MongoDB driver error into a `RepositoryError`.
 * Repository errors and errors from outside the data layer (for example business errors thrown inside a transaction) are returned unchanged.
 * Messages never include document values, because duplicate-key messages can contain patient data.
 *
 * @param error - Error caught from a Mongoose call.
 * @param operation - Operation that failed, for example `LovRepository.create`.
 * @returns The error to rethrow.
 */
export function translateMongoError(
  error: unknown,
  operation: string,
): unknown {
  if (error instanceof RepositoryError) {
    return error
  }
  if (
    error instanceof mongo.MongoServerError &&
    error.code === DUPLICATE_KEY_CODE
  ) {
    return new RepositoryConflictError(
      `${operation}: duplicate value on a unique field`,
      {
        operation,
        cause: error,
      },
    )
  }
  if (
    error instanceof MongooseError.ValidationError ||
    error instanceof MongooseError.CastError
  ) {
    return new RepositoryValidationError(
      `${operation}: data rejected by the schema`,
      {
        operation,
        cause: error,
      },
    )
  }
  if (isUnavailable(error)) {
    return new RepositoryUnavailableError(
      `${operation}: database unavailable`,
      {
        operation,
        cause: error,
      },
    )
  }
  if (error instanceof mongo.MongoError || error instanceof MongooseError) {
    return new RepositoryError(`${operation}: unexpected database error`, {
      operation,
      cause: error,
    })
  }
  return error
}
