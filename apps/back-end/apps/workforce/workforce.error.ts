/**
 * Kinds of workforce errors, which the HTTP filter maps to status codes.
 */
export type WorkforceErrorKind =
  'forbidden' | 'not_found' | 'conflict' | 'invalid'

/**
 * Base class of business rejections raised by the workforce (HR) module. Transport-neutral:
 * `WorkforceExceptionFilter` turns it into an HTTP response.
 * The message is shown to clients, so it must be a fixed text and never hold record values.
 *
 * @property kind - Category of the rejection.
 * @property code - Stable machine-readable code, for example `organization_exists`.
 */
export class WorkforceError extends Error {
  readonly kind: WorkforceErrorKind
  readonly code: string

  /**
   * @param kind - Category of the rejection.
   * @param code - Stable machine-readable code.
   * @param message - Fixed public message.
   */
  constructor(kind: WorkforceErrorKind, code: string, message: string) {
    super(message)
    this.name = new.target.name
    this.kind = kind
    this.code = code
  }
}

/**
 * The caller may not do this. HTTP 403.
 */
export class ForbiddenError extends WorkforceError {
  /**
   * @param code - Stable machine-readable code.
   * @param message - Fixed public message.
   */
  constructor(code: string, message: string) {
    super('forbidden', code, message)
  }
}

/**
 * The record does not exist in the caller's tenant. HTTP 404.
 */
export class NotFoundError extends WorkforceError {
  /**
   * @param code - Stable machine-readable code.
   * @param message - Fixed public message.
   */
  constructor(code: string, message: string) {
    super('not_found', code, message)
  }
}

/**
 * The request conflicts with existing data. HTTP 409.
 */
export class ConflictError extends WorkforceError {
  /**
   * @param code - Stable machine-readable code.
   * @param message - Fixed public message.
   */
  constructor(code: string, message: string) {
    super('conflict', code, message)
  }
}

/**
 * The request is well formed but breaks a business rule. HTTP 422.
 */
export class InvalidRequestError extends WorkforceError {
  /**
   * @param code - Stable machine-readable code.
   * @param message - Fixed public message.
   */
  constructor(code: string, message: string) {
    super('invalid', code, message)
  }
}
