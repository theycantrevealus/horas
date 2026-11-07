import { format, Logform } from 'winston'
import { getRequestContext } from './context'

/**
 * Value written in place of a redacted field.
 */
export const REDACTED = '[REDACTED]'

/**
 * Field names whose values are never logged. Matching ignores case and non-alphanumeric
 * characters, so `access_token`, `accessToken` and `Access-Token` all match `accesstoken`.
 * Covers credentials and Indonesian patient identifiers (NIK, BPJS number).
 */
export const DEFAULT_REDACT_KEYS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'clientsecret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'cookie',
  'setcookie',
  'apikey',
  'xapikey',
  'privatekey',
  'otp',
  'pin',
  'nik',
  'bpjs',
  'nobpjs',
  'nomorbpjs',
  'passwordhash',
  'passwordhistory',
  'refreshtokenhash',
  'totpsecret',
  'totpsecretencrypted',
  'recoverycodehashes',
  'publickey',
  'clientsecretref',
  'identifiers',
  'valueencrypted',
  'valuehash',
  'birthdate',
  'dateofbirth',
  'npwp',
  'taxid',
  'passport',
  'ssn',
  'nric',
  'bankaccounts',
  'accountnumber',
  'iban',
  'familymembers',
  'addresses',
  'personalcontacts',
  'temporarypassword',
  'jwtsecret',
]

/**
 * Nesting depth below which values are replaced by `[Truncated]`.
 */
const MAX_DEPTH = 6

/**
 * Longest string kept in a log field; longer strings are cut.
 */
const MAX_STRING_LENGTH = 2000

/**
 * Most array items kept in a log field; extra items are dropped.
 */
const MAX_ARRAY_ITEMS = 50

/**
 * Fields winston manages itself; they are not sanitized.
 */
const RESERVED_FIELDS = new Set(['level', 'message', 'stack'])

/**
 * Normalizes a field name for redaction matching.
 *
 * @param key - Field name.
 * @returns The name in lower case with only letters and digits.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Options of the sanitizer.
 *
 * @property redactKeys - Normalized field names to redact.
 * @property includeErrorStack - Whether nested `Error` values keep their stack.
 */
interface SanitizeOptions {
  redactKeys: ReadonlySet<string>
  includeErrorStack: boolean
}

/**
 * Converts an `Error` into a plain object, since JSON serialization drops its fields.
 *
 * @param error - Error to convert.
 * @param options - Sanitizer options.
 * @returns Name, message, code and optionally stack of the error.
 */
function serializeError(
  error: Error,
  options: SanitizeOptions,
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  }
  if ('code' in error && error.code !== undefined) {
    serialized.code = error.code
  }
  if ('retryable' in error && typeof error.retryable === 'boolean') {
    serialized.retryable = error.retryable
  }
  if (options.includeErrorStack && error.stack) {
    serialized.stack = error.stack
  }
  return serialized
}

/**
 * Copies a value for logging: redacts sensitive fields, serializes errors and limits size.
 *
 * @param value - Value to copy.
 * @param options - Sanitizer options.
 * @param depth - Current nesting depth.
 * @param seen - Objects already visited, to stop at circular references.
 * @returns A log-safe copy of the value.
 */
function sanitizeValue(
  value: unknown,
  options: SanitizeOptions,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value
  }
  if (typeof value === 'bigint') {
    return value.toString()
  }
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (value instanceof Date) {
    return value
  }
  if (value instanceof Error) {
    return serializeError(value, options)
  }
  if (seen.has(value)) {
    return '[Circular]'
  }
  if (depth >= MAX_DEPTH) {
    return '[Truncated]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item: unknown) => sanitizeValue(item, options, depth + 1, seen))
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[${value.length - MAX_ARRAY_ITEMS} more]`)
    }
    return items
  }

  const copy: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    copy[key] = options.redactKeys.has(normalizeKey(key))
      ? REDACTED
      : sanitizeValue(item, options, depth + 1, seen)
  }
  return copy
}

/**
 * Turns the `stack` field into one string. Nest's logger sends it as an array that may
 * contain only `undefined`; such stacks are removed.
 *
 * @param stack - Raw `stack` field.
 * @returns The stack text, or `undefined` when there is none.
 */
function normalizeStack(stack: unknown): string | undefined {
  const parts = (Array.isArray(stack) ? stack : [stack]).filter(
    (part: unknown): part is string =>
      typeof part === 'string' && part.length > 0,
  )
  return parts.length > 0 ? parts.join('\n') : undefined
}

/**
 * Options of the `sanitize` format.
 *
 * @property redactKeys - Field names to redact in addition to `DEFAULT_REDACT_KEYS`.
 */
export interface SanitizeFormatOptions {
  redactKeys?: readonly string[]
}

/**
 * Reads `redactKeys` from the options winston passes to a format, which it types as `unknown`.
 *
 * @param formatOptions - Options given to `sanitize(...)`.
 * @returns The extra keys to redact, or an empty list.
 */
function readRedactKeys(formatOptions: unknown): string[] {
  const { redactKeys } = (formatOptions ?? {}) as SanitizeFormatOptions
  return Array.isArray(redactKeys)
    ? redactKeys.filter((key): key is string => typeof key === 'string')
    : []
}

/**
 * Format that makes every entry safe to write: redacts sensitive fields at any depth,
 * serializes `Error` values, cuts large values and normalizes the stack.
 *
 * @param info - Entry to sanitize.
 * @param formatOptions - Extra keys to redact, given as `sanitize({ redactKeys })`.
 * @returns The sanitized entry.
 */
export const sanitize = format(
  (info: Logform.TransformableInfo, formatOptions: unknown) => {
    const keys = readRedactKeys(formatOptions)
    const stack = normalizeStack(info.stack)
    const options: SanitizeOptions = {
      redactKeys: new Set([...DEFAULT_REDACT_KEYS, ...keys].map(normalizeKey)),
      includeErrorStack: stack === undefined,
    }
    const seen = new WeakSet<object>()

    if (stack === undefined) {
      delete info.stack
    } else {
      info.stack = stack
    }
    if (typeof info.message !== 'string' && info.message !== undefined) {
      info.message = JSON.stringify(
        sanitizeValue(info.message, options, 0, seen),
      )
    }
    for (const key of Object.keys(info)) {
      if (RESERVED_FIELDS.has(key)) {
        continue
      }
      if (info[key] === undefined) {
        delete info[key]
      } else if (options.redactKeys.has(normalizeKey(key))) {
        info[key] = REDACTED
      } else {
        info[key] = sanitizeValue(info[key], options, 0, seen)
      }
    }
    return info
  },
)

/**
 * Format that adds the current request's correlation identifier, when there is one.
 *
 * @param info - Entry to enrich.
 * @returns The entry with `correlationId`.
 */
export const requestContext = format((info: Logform.TransformableInfo) => {
  const context = getRequestContext()
  if (context && info.correlationId === undefined) {
    info.correlationId = context.correlationId
  }
  return info
})

/**
 * Fields printed in the fixed columns of the pretty format, so they are not repeated in the metadata.
 */
const PRETTY_COLUMNS = new Set([
  'level',
  'message',
  'timestamp',
  'context',
  'correlationId',
  'stack',
])

/**
 * Pads a column of the pretty format.
 *
 * @param value - Column value.
 * @param width - Column width.
 * @returns The value padded or cut to `width`.
 */
function column(value: string, width: number): string {
  return value.length > width ? value.slice(0, width) : value.padEnd(width)
}

/**
 * Readable one-line format for local development:
 * `time LEVEL [context] (correlationId) message {metadata}`, followed by the stack when present.
 *
 * @returns The winston format.
 */
export function prettyFormat(): Logform.Format {
  const colorizer = format.colorize()
  return format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.printf((info: Logform.TransformableInfo) => {
      const level = colorizer.colorize(
        info.level,
        column(info.level.toUpperCase(), 7),
      )
      const context =
        typeof info.context === 'string' ? `[${info.context}] ` : ''
      const correlation =
        typeof info.correlationId === 'string' ? `(${info.correlationId}) ` : ''
      const meta = Object.fromEntries(
        Object.entries(info).filter(([key]) => !PRETTY_COLUMNS.has(key)),
      )
      const metaText =
        Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
      const stack = typeof info.stack === 'string' ? `\n${info.stack}` : ''
      const message = typeof info.message === 'string' ? info.message : ''
      return `${String(info.timestamp)} ${level} ${process.pid} ${context}${correlation}${message}${metaText}${stack}`
    }),
  )
}

/**
 * Machine-readable format: one JSON object per line with an ISO timestamp.
 *
 * @returns The winston format.
 */
export function jsonFormat(): Logform.Format {
  return format.combine(format.timestamp(), format.json())
}
