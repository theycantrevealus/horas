/**
 * Log levels used by every logger in the platform, most severe first.
 * They are winston's `npm` levels plus `fatal`, which Nest's `LoggerService` can emit.
 */
export const LOG_LEVELS = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  http: 4,
  verbose: 5,
  debug: 6,
  silly: 7,
} as const

/**
 * Name of a platform log level.
 */
export type LogLevelName = keyof typeof LOG_LEVELS

/**
 * Every platform log level name, for validation.
 */
export const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS) as LogLevelName[]

/**
 * Console colours for each level, registered with `winston.addColors`.
 */
export const LOG_LEVEL_COLORS: Record<LogLevelName, string> = {
  fatal: 'magenta',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  verbose: 'blue',
  debug: 'white',
  silly: 'gray',
}

/**
 * Turns a level reported by another library into a platform level.
 */
export type LogLevelMapper = (level: unknown) => LogLevelName

/**
 * Level names used by common libraries and standards (syslog, log4j, pino, kafkajs, ...),
 * mapped to the closest platform level. Keys are lower case.
 */
const LEVEL_ALIASES: Record<string, LogLevelName> = {
  emerg: 'fatal',
  emergency: 'fatal',
  alert: 'fatal',
  crit: 'fatal',
  critical: 'fatal',
  err: 'error',
  warning: 'warn',
  notice: 'info',
  log: 'info',
  trace: 'silly',
}

/**
 * Checks whether a value is a platform level name.
 *
 * @param value - Value to check.
 * @returns `true` when the value is a key of `LOG_LEVELS`.
 */
export function isLogLevelName(value: unknown): value is LogLevelName {
  return typeof value === 'string' && Object.hasOwn(LOG_LEVELS, value)
}

/**
 * Converts a level name from any library into a platform level.
 * Matching ignores case and knows common aliases such as `warning`, `critical` and `trace`.
 *
 * @param level - Level reported by the library.
 * @param fallback - Level used when the name is unknown or not a string.
 * @returns The matching platform level, or `fallback`.
 */
export function toLogLevelName(
  level: unknown,
  fallback: LogLevelName = 'info',
): LogLevelName {
  if (typeof level !== 'string') {
    return fallback
  }
  const name = level.trim().toLowerCase()
  if (isLogLevelName(name)) {
    return name
  }
  return LEVEL_ALIASES[name] ?? fallback
}

/**
 * Creates a mapper for a library whose levels are numbers or its own names.
 * Values found in `map` win; other strings go through `toLogLevelName`; anything else becomes `fallback`.
 *
 * @example
 * // kafkajs levels: NOTHING 0, ERROR 1, WARN 2, INFO 4, DEBUG 5
 * const kafkaLevel = createLogLevelMapper({ 0: 'error', 1: 'error', 2: 'warn', 4: 'info', 5: 'debug' })
 *
 * @param map - Library level (number or string) to platform level.
 * @param fallback - Level used when the library level is unknown.
 * @returns A mapper usable with `createExternalLogHandler`.
 */
export function createLogLevelMapper(
  map: Readonly<Record<string | number, LogLevelName>>,
  fallback: LogLevelName = 'info',
): LogLevelMapper {
  return (level: unknown): LogLevelName => {
    if (
      (typeof level === 'string' || typeof level === 'number') &&
      Object.hasOwn(map, level)
    ) {
      return map[level]
    }
    return toLogLevelName(level, fallback)
  }
}
