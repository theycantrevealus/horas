import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * Defaults of the change-log settings (`logging.md` section 13.3).
 */
const DEFAULTS = {
  maxLagSeconds: 300,
  outboxKeepDays: 7,
  recordMaxBytes: 200_000,
  relayIntervalMs: 1000,
  relayBatchSize: 100,
}

/**
 * Validates the change-log variables in `change-log.env`.
 * At least one output (stdout or a file directory) must be enabled.
 */
export const ChangeLogSchema = Joi.object({
  CHANGE_LOG_STDOUT: Joi.boolean().default(false),
  CHANGE_LOG_FILE_DIR: Joi.string().allow('').default(''),
  CHANGE_LOG_HASH_CHAIN: Joi.boolean().default(true),
  CHANGE_RELAY_MAX_LAG_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(DEFAULTS.maxLagSeconds),
  CHANGE_RELAY_INTERVAL_MS: Joi.number()
    .integer()
    .min(100)
    .default(DEFAULTS.relayIntervalMs),
  CHANGE_RELAY_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(DEFAULTS.relayBatchSize),
  CHANGE_OUTBOX_KEEP_DAYS: Joi.number()
    .integer()
    .positive()
    .default(DEFAULTS.outboxKeepDays),
  CHANGE_RECORD_MAX_BYTES: Joi.number()
    .integer()
    .min(10_000)
    .default(DEFAULTS.recordMaxBytes),
}).custom((value: Record<string, unknown>, helpers) => {
  const stdout = value.CHANGE_LOG_STDOUT === true
  const fileDir =
    typeof value.CHANGE_LOG_FILE_DIR === 'string' &&
    value.CHANGE_LOG_FILE_DIR.length > 0
  return stdout || fileDir
    ? value
    : helpers.message({
        custom:
          'Enable CHANGE_LOG_STDOUT or set CHANGE_LOG_FILE_DIR: the change log needs an output',
      })
}, 'change log needs an output')

/**
 * Parses a boolean variable.
 *
 * @param value - Raw variable value.
 * @param fallback - Value used when the variable is unset.
 * @returns The boolean.
 */
function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback
  }
  return value.trim().toLowerCase() === 'true'
}

/**
 * Parses a positive integer variable.
 *
 * @param value - Raw variable value.
 * @param fallback - Value used when the variable is unset or invalid.
 * @returns The integer.
 */
function toInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Typed change-log configuration, available under the `changeLog` namespace.
 * The values are validated by `ChangeLogSchema` before this factory runs.
 */
export const ChangeLogConfig = registerAs('changeLog', () => ({
  stdout: toBoolean(process.env.CHANGE_LOG_STDOUT, false),
  fileDir: process.env.CHANGE_LOG_FILE_DIR || undefined,
  hashChain: toBoolean(process.env.CHANGE_LOG_HASH_CHAIN, true),
  relay: {
    maxLagSeconds: toInteger(
      process.env.CHANGE_RELAY_MAX_LAG_SECONDS,
      DEFAULTS.maxLagSeconds,
    ),
    intervalMs: toInteger(
      process.env.CHANGE_RELAY_INTERVAL_MS,
      DEFAULTS.relayIntervalMs,
    ),
    batchSize: toInteger(
      process.env.CHANGE_RELAY_BATCH_SIZE,
      DEFAULTS.relayBatchSize,
    ),
  },
  outboxKeepDays: toInteger(
    process.env.CHANGE_OUTBOX_KEEP_DAYS,
    DEFAULTS.outboxKeepDays,
  ),
  recordMaxBytes: toInteger(
    process.env.CHANGE_RECORD_MAX_BYTES,
    DEFAULTS.recordMaxBytes,
  ),
}))

/**
 * Typed change-log configuration.
 */
export type ChangeLogConfigType = ReturnType<typeof ChangeLogConfig>
