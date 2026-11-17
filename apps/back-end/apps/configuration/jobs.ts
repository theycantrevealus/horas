import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * Defaults of the HR job settings (`.claude/design/plans/gateway-hr-7-worker-expiry-jobs.md` WJ13).
 */
const DEFAULTS = {
  enabled: true,
  intervalMs: 3_600_000,
  batchSize: 200,
  leaseSeconds: 300,
}

/**
 * Validates the optional variables of `jobs.env`. Every variable has a default, so the file itself
 * is optional. Only the worker, which runs the jobs, reads them.
 */
export const JobsSchema = Joi.object({
  HR_JOBS_ENABLED: Joi.boolean().default(DEFAULTS.enabled),
  HR_JOBS_INTERVAL_MS: Joi.number()
    .integer()
    .min(60_000)
    .default(DEFAULTS.intervalMs),
  HR_JOBS_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(DEFAULTS.batchSize),
  HR_JOBS_LEASE_SECONDS: Joi.number()
    .integer()
    .min(30)
    .default(DEFAULTS.leaseSeconds),
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
 * Typed HR job configuration, available under the `jobs` namespace.
 */
export const JobsConfig = registerAs('jobs', () => ({
  enabled: process.env.HR_JOBS_ENABLED !== 'false',
  intervalMs: toInteger(process.env.HR_JOBS_INTERVAL_MS, DEFAULTS.intervalMs),
  batchSize: toInteger(process.env.HR_JOBS_BATCH_SIZE, DEFAULTS.batchSize),
  leaseSeconds: toInteger(
    process.env.HR_JOBS_LEASE_SECONDS,
    DEFAULTS.leaseSeconds,
  ),
}))

/**
 * Type of the `jobs` configuration.
 */
export type JobsConfigType = ReturnType<typeof JobsConfig>
