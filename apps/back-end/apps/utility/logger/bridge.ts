import { Logger } from 'winston'
import { LogLevelMapper, toLogLevelName } from './level'

/**
 * One log entry emitted by a third-party library, in a library-neutral shape.
 *
 * @property level - Level as the library reports it (number or name).
 * @property message - Log message.
 * @property namespace - Library component that logged, used as the log context.
 * @property label - Optional label the library attaches, for example `ERROR`.
 * @property meta - Extra structured fields sent by the library.
 */
export interface ExternalLogEntry {
  level: unknown
  message: string
  namespace?: string
  label?: string
  meta?: Record<string, unknown>
}

/**
 * Function a library adapter calls for each log entry.
 */
export type ExternalLogHandler = (entry: ExternalLogEntry) => void

/**
 * Creates a handler that writes a library's logs through the platform winston logger,
 * so they get the same transports, redaction and correlation identifier as application logs.
 *
 * @example
 * // kafkajs `logCreator`
 * const handle = createExternalLogHandler(winstonLogger, kafkaLevel)
 * const logCreator = () => ({ namespace, level, label, log: { message, ...meta } }) =>
 *   handle({ namespace, level, label, message, meta })
 *
 * @param logger - Platform winston logger (`WINSTON_MODULE_PROVIDER`).
 * @param mapLevel - Converts the library level to a platform level. Defaults to name matching.
 * @returns The handler.
 */
export function createExternalLogHandler(
  logger: Logger,
  mapLevel: LogLevelMapper = (level) => toLogLevelName(level),
): ExternalLogHandler {
  return ({
    level,
    message,
    namespace,
    label,
    meta,
  }: ExternalLogEntry): void => {
    logger.log(mapLevel(level), message, { ...meta, context: namespace, label })
  }
}
