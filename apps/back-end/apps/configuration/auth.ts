import { registerAs } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * Defaults of the authentication settings.
 */
const DEFAULTS = {
  jwtIssuer: 'horas',
  jwtAudience: 'horas-back-office',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlDays: 7,
  maxFailedAttempts: 5,
  lockoutMinutes: 15,
  passwordMinLength: 12,
  passwordHistoryCount: 5,
  securityEventRetentionDays: 365,
  externalAccountMaxDays: 90,
}

/**
 * Shortest accepted signing secret, in characters. HS256 needs at least 256 bits of key.
 */
const MIN_SECRET_LENGTH = 32

/**
 * Validates the authentication variables in `auth.env`.
 * `AUTH_JWT_SECRET` has no default on purpose: the application must not start with a guessable key.
 */
export const AuthSchema = Joi.object({
  AUTH_JWT_SECRET: Joi.string().min(MIN_SECRET_LENGTH).required(),
  AUTH_JWT_ISSUER: Joi.string().default(DEFAULTS.jwtIssuer),
  AUTH_JWT_AUDIENCE: Joi.string().default(DEFAULTS.jwtAudience),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(DEFAULTS.accessTokenTtlSeconds),
  AUTH_REFRESH_TOKEN_TTL_DAYS: Joi.number()
    .integer()
    .min(1)
    .max(90)
    .default(DEFAULTS.refreshTokenTtlDays),
  AUTH_MAX_FAILED_ATTEMPTS: Joi.number()
    .integer()
    .min(3)
    .max(20)
    .default(DEFAULTS.maxFailedAttempts),
  AUTH_LOCKOUT_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(DEFAULTS.lockoutMinutes),
  AUTH_PASSWORD_MIN_LENGTH: Joi.number()
    .integer()
    .min(8)
    .max(64)
    .default(DEFAULTS.passwordMinLength),
  AUTH_PASSWORD_HISTORY_COUNT: Joi.number()
    .integer()
    .min(0)
    .max(24)
    .default(DEFAULTS.passwordHistoryCount),
  AUTH_SECURITY_EVENT_RETENTION_DAYS: Joi.number()
    .integer()
    .positive()
    .default(DEFAULTS.securityEventRetentionDays),
  AUTH_EXTERNAL_ACCOUNT_MAX_DAYS: Joi.number()
    .integer()
    .positive()
    .default(DEFAULTS.externalAccountMaxDays),
})

/**
 * Parses an integer variable.
 *
 * @param value - Raw variable value.
 * @param fallback - Value used when the variable is unset or not an integer.
 * @returns The integer.
 */
function toInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return value !== undefined && value !== '' && Number.isInteger(parsed)
    ? parsed
    : fallback
}

/**
 * Typed authentication configuration, available under the `auth` namespace.
 * The values are validated by `AuthSchema` before this factory runs.
 */
export const AuthConfig = registerAs('auth', () => ({
  jwt: {
    secret: process.env.AUTH_JWT_SECRET ?? '',
    issuer: process.env.AUTH_JWT_ISSUER || DEFAULTS.jwtIssuer,
    audience: process.env.AUTH_JWT_AUDIENCE || DEFAULTS.jwtAudience,
    accessTokenTtlSeconds: toInteger(
      process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      DEFAULTS.accessTokenTtlSeconds,
    ),
  },
  refreshTokenTtlDays: toInteger(
    process.env.AUTH_REFRESH_TOKEN_TTL_DAYS,
    DEFAULTS.refreshTokenTtlDays,
  ),
  lockout: {
    maxAttempts: toInteger(
      process.env.AUTH_MAX_FAILED_ATTEMPTS,
      DEFAULTS.maxFailedAttempts,
    ),
    lockoutMinutes: toInteger(
      process.env.AUTH_LOCKOUT_MINUTES,
      DEFAULTS.lockoutMinutes,
    ),
  },
  password: {
    minLength: toInteger(
      process.env.AUTH_PASSWORD_MIN_LENGTH,
      DEFAULTS.passwordMinLength,
    ),
    historyCount: toInteger(
      process.env.AUTH_PASSWORD_HISTORY_COUNT,
      DEFAULTS.passwordHistoryCount,
    ),
  },
  securityEventRetentionDays: toInteger(
    process.env.AUTH_SECURITY_EVENT_RETENTION_DAYS,
    DEFAULTS.securityEventRetentionDays,
  ),
  externalAccountMaxDays: toInteger(
    process.env.AUTH_EXTERNAL_ACCOUNT_MAX_DAYS,
    DEFAULTS.externalAccountMaxDays,
  ),
}))

/**
 * Typed authentication configuration.
 */
export type AuthConfigType = ReturnType<typeof AuthConfig>
