import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'
import { LOG_LEVEL_NAMES, LogLevelName } from '@utility/logger/level'

/**
 * Output styles of the console transport.
 * `pretty` is a readable table for local development, `json` is one JSON object per line for log tools.
 */
export const LOG_FORMATS = ['pretty', 'json'] as const

/**
 * Output style of the console transport.
 */
export type LogFormat = (typeof LOG_FORMATS)[number]

/**
 * Default maximum size of one log file, in megabytes, before it is rotated.
 */
const DEFAULT_FILE_MAX_SIZE_MB = 20

/**
 * Default number of rotated log files to keep.
 */
const DEFAULT_FILE_MAX_FILES = 10

/**
 * Validates the logger variables in `logger.env`.
 */
export const LoggerSchema = Joi.object({
  LOG_LEVEL: Joi.string()
    .valid(...LOG_LEVEL_NAMES)
    .default('info'),
  LOG_FORMAT: Joi.string()
    .valid(...LOG_FORMATS)
    .default('json'),
  LOG_FILE_PATH: Joi.string().allow('').optional(),
  LOG_FILE_MAX_SIZE_MB: Joi.number()
    .integer()
    .positive()
    .default(DEFAULT_FILE_MAX_SIZE_MB),
  LOG_FILE_MAX_FILES: Joi.number()
    .integer()
    .positive()
    .default(DEFAULT_FILE_MAX_FILES),
  LOG_REDACT_KEYS: Joi.string().allow('').optional(),
})

/**
 * Splits a comma-separated variable into trimmed, non-empty items.
 *
 * @param value - Raw variable value.
 * @returns The items, or an empty list when the variable is unset.
 */
function toList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/**
 * Parses a positive integer variable.
 *
 * @param value - Raw variable value.
 * @param fallback - Value used when the variable is unset or invalid.
 * @returns The parsed integer.
 */
function toPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Typed logger configuration, available under the `logger` namespace.
 * The values are validated by `LoggerSchema` before this factory runs.
 */
export const LoggerConfig = registerAs('logger', () => ({
  level: (process.env.LOG_LEVEL ?? 'info') as LogLevelName,
  format: (process.env.LOG_FORMAT ?? 'json') as LogFormat,
  file: {
    path: process.env.LOG_FILE_PATH || undefined,
    maxSizeBytes:
      toPositiveInteger(
        process.env.LOG_FILE_MAX_SIZE_MB,
        DEFAULT_FILE_MAX_SIZE_MB,
      ) *
      1024 *
      1024,
    maxFiles: toPositiveInteger(
      process.env.LOG_FILE_MAX_FILES,
      DEFAULT_FILE_MAX_FILES,
    ),
  },
  redactKeys: toList(process.env.LOG_REDACT_KEYS),
}))
