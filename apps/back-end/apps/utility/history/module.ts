import { Module } from '@nestjs/common'
import {
  ChangeLogConfig,
  type ChangeLogConfigType,
} from '@configuration/change-log'
import {
  ChangeLogger,
  ChangeLogSink,
  DailyFileSink,
  StdoutSink,
} from './logger'
import { CHANGE_RECORDER, OutboxChangeRecorder } from './recorder'

/**
 * Provides `CHANGE_RECORDER` to repository implementations. Import it in every
 * `RepositoryModule.forFeature` whose repositories record changes. The recorder writes to
 * `CHANGE_OUTBOX`, which the (global) connection module provides.
 */
@Module({
  providers: [{ provide: CHANGE_RECORDER, useClass: OutboxChangeRecorder }],
  exports: [CHANGE_RECORDER],
})
export class ChangeHistoryModule {}

/**
 * Creates the sinks enabled by the configuration.
 *
 * @param config - Typed change-log configuration.
 * @returns The sinks; at least one, because the schema requires an output.
 */
export function createChangeLogSinks(
  config: ChangeLogConfigType,
): ChangeLogSink[] {
  const sinks: ChangeLogSink[] = []
  if (config.fileDir) {
    sinks.push(new DailyFileSink(config.fileDir))
  }
  if (config.stdout) {
    sinks.push(new StdoutSink())
  }
  return sinks
}

/**
 * Provides the `ChangeLogger`. Only the application that runs the change relay (`worker`) imports it.
 */
@Module({
  providers: [
    {
      provide: ChangeLogger,
      inject: [ChangeLogConfig.KEY],
      /**
       * Builds the change logger from the typed configuration.
       *
       * @param config - Typed change-log configuration.
       * @returns The change logger.
       */
      useFactory: (config: ChangeLogConfigType) =>
        new ChangeLogger(createChangeLogSinks(config), config.hashChain),
    },
  ],
  exports: [ChangeLogger],
})
export class ChangeLogModule {}
