import { ConfigType } from '@nestjs/config'
import { WinstonModuleOptions } from 'nest-winston'
import { addColors, format, transport, transports } from 'winston'
import { LoggerConfig } from '@configuration/logger'
import { jsonFormat, prettyFormat, requestContext, sanitize } from './format'
import { LOG_LEVEL_COLORS, LOG_LEVELS } from './level'

/**
 * Typed logger configuration.
 */
export type LoggerConfigType = ConfigType<typeof LoggerConfig>

/**
 * Creates the transports for one application.
 * The console always gets output (pretty or JSON, by `LOG_FORMAT`) and handles uncaught
 * exceptions and rejections. A rotating JSON file is added when `LOG_FILE_PATH` is set.
 * Transports are created per call, so nothing is opened when this file is only imported.
 *
 * @param config - Typed logger configuration.
 * @returns The transports.
 */
export function createTransports(config: LoggerConfigType): transport[] {
  const consoleTransport = new transports.Console({
    format: config.format === 'pretty' ? prettyFormat() : jsonFormat(),
    handleExceptions: true,
    handleRejections: true,
  })
  const created: transport[] = [consoleTransport]

  if (config.file.path) {
    created.push(
      new transports.File({
        filename: config.file.path,
        format: jsonFormat(),
        maxsize: config.file.maxSizeBytes,
        maxFiles: config.file.maxFiles,
        tailable: true,
      }),
    )
  }
  return created
}

/**
 * Builds the `nest-winston` options from the typed logger configuration.
 * Every entry is enriched with the correlation identifier and sanitized before any transport sees it.
 *
 * @param config - Typed logger configuration.
 * @returns Options for `WinstonModule.forRootAsync`.
 */
export function createLoggerOptions(
  config: LoggerConfigType,
): WinstonModuleOptions {
  addColors(LOG_LEVEL_COLORS)
  return {
    levels: LOG_LEVELS,
    level: config.level,
    format: format.combine(
      format.errors({ stack: true }),
      requestContext(),
      sanitize({ redactKeys: config.redactKeys }),
    ),
    transports: createTransports(config),
    exitOnError: true,
  }
}
