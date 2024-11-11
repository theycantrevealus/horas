import { Provider, Type } from '@nestjs/common'
import { createLogger, Logger, LoggerOptions } from 'winston'

import { WinstonLogger } from './classes'
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_OPTIONS,
  WINSTON_MODULE_PROVIDER,
} from './constants'
import {
  WinstonModuleAsyncOptions,
  WinstonModuleOptions,
  WinstonModuleOptionsFactory,
} from './interfaces'

export function createNestWinstonLogger(
  loggerOpts: WinstonModuleOptions
): WinstonLogger {
  if (loggerOpts.instance) {
    return new WinstonLogger(loggerOpts.instance)
  }
  return new WinstonLogger(createLogger(loggerOpts))
}

export function createWinstonProviders(
  loggerOpts: WinstonModuleOptions
): Provider[] {
  return [
    {
      provide: WINSTON_MODULE_PROVIDER,
      useFactory: () => createLogger(loggerOpts),
    },
    {
      provide: WINSTON_MODULE_NEST_PROVIDER,
      useFactory: (logger: Logger) => {
        return new WinstonLogger(logger)
      },
      inject: [WINSTON_MODULE_PROVIDER],
    },
  ]
}

export function createWinstonAsyncProviders(
  options: WinstonModuleAsyncOptions
): Provider[] {
  const providers: Provider[] = [
    {
      provide: WINSTON_MODULE_PROVIDER,
      useFactory: (loggerOpts: LoggerOptions) => createLogger(loggerOpts),
      inject: [WINSTON_MODULE_OPTIONS],
    },
    {
      provide: WINSTON_MODULE_NEST_PROVIDER,
      useFactory: (logger: Logger) => {
        return new WinstonLogger(logger)
      },
      inject: [WINSTON_MODULE_PROVIDER],
    },
  ]

  if (options.useClass) {
    const useClass = options.useClass as Type<WinstonModuleOptionsFactory>
    providers.push(
      ...[
        {
          provide: WINSTON_MODULE_OPTIONS,
          useFactory: async (optionsFactory: WinstonModuleOptionsFactory) =>
            await optionsFactory.createWinstonModuleOptions(),
          inject: [useClass],
        },
        {
          provide: useClass,
          useClass,
        },
      ]
    )
  }

  if (options.useFactory) {
    providers.push({
      provide: WINSTON_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    })
  }

  return providers
}
