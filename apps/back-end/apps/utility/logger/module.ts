import { Module } from '@nestjs/common'
import { ConfigType } from '@nestjs/config'
import { WinstonModule } from 'nest-winston'
import { LoggerConfig } from '@configuration/logger'
import { AppLogger } from './service'
import { createLoggerOptions } from './transport'

/**
 * Platform logger, built on `nest-winston` and configured from the `logger` config namespace.
 * Import it in the application's root module, next to `ConfigModule.forRoot` with `LoggerConfig` loaded,
 * and in every feature module whose classes inject `AppLogger`. It is not global.
 * `main.ts` routes Nest's logger to winston with `app.useLogger`, so `AppLogger` and framework logs share it.
 */
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [LoggerConfig.KEY],
      useFactory: (config: ConfigType<typeof LoggerConfig>) =>
        createLoggerOptions(config),
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}
