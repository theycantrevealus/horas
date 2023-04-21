import { ApplicationConfig } from '@configuration/environtment'
import { MongoConfig } from '@configuration/mongo'
import { SocketConfig } from '@configuration/socket'
import { Inject, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { WINSTON_MODULE_PROVIDER } from '@utility/logger/constants'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import * as winston from 'winston'
import { Logger } from 'winston'

import { EventsModule } from './events/event.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/environment/${
        process.env.NODE_ENV === '' ? '' : process.env.NODE_ENV
      }.env`,
      load: [ApplicationConfig, MongoConfig, SocketConfig],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const today = new TimeManagement()
        return {
          levels: {
            error: 0,
            warn: 1,
            verbose: 3,
          },
          transports: [
            new winston.transports.Console({
              level: 'error',
              handleExceptions: true,
              handleRejections: true,
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.printf((data) => {
                  return JSON.stringify({
                    timestamp: data.timestamp,
                    level: data.level,
                    message: data.message,
                  })
                })
              ),
            }),
            new winston.transports.Console({
              level: 'verbose',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.printf((data) => {
                  return JSON.stringify({
                    timestamp: data.timestamp,
                    level: data.level,
                    message: data.message,
                  })
                })
              ),
            }),
            new winston.transports.Console({
              level: 'warn',
              format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
                winston.format.printf((data) => {
                  return JSON.stringify({
                    timestamp: data.timestamp,
                    level: data.level,
                    message: data.message,
                  })
                })
              ),
            }),
          ],
        }
      },
      inject: [ConfigService],
    }),
    EventsModule,
  ],
})
export class SocketModule {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {
    //
  }
}
