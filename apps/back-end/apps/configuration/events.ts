import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * Defaults of the event relay settings (`.claude/design/plans/gateway-hr-events-to-identity.md`
 * H11).
 */
const DEFAULTS = {
  intervalMs: 1000,
  batchSize: 100,
  maxLagSeconds: 300,
}

/**
 * Validates the optional variables of `events.env`. Every variable has a default, so the file
 * itself is optional. Only the worker, which runs the relay, reads them.
 */
export const EventsSchema = Joi.object({
  EVENT_RELAY_INTERVAL_MS: Joi.number()
    .integer()
    .min(100)
    .default(DEFAULTS.intervalMs),
  EVENT_RELAY_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(DEFAULTS.batchSize),
  EVENT_RELAY_MAX_LAG_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(DEFAULTS.maxLagSeconds),
})

/**
 * Parses an integer variable.
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
 * Typed event relay configuration, available under the `events` namespace.
 */
export const EventsConfig = registerAs('events', () => ({
  relay: {
    intervalMs: toInteger(
      process.env.EVENT_RELAY_INTERVAL_MS,
      DEFAULTS.intervalMs,
    ),
    batchSize: toInteger(
      process.env.EVENT_RELAY_BATCH_SIZE,
      DEFAULTS.batchSize,
    ),
    maxLagSeconds: toInteger(
      process.env.EVENT_RELAY_MAX_LAG_SECONDS,
      DEFAULTS.maxLagSeconds,
    ),
  },
}))

/**
 * Type of the `events` configuration.
 */
export type EventsConfigType = ReturnType<typeof EventsConfig>
