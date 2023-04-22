import { CacheModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthModule } from '@security/auth.module'
import { WinstonModule } from '@utility/logger/module'
import { TimeManagement } from '@utility/time'
import * as redisStore from 'cache-manager-ioredis'
import * as winston from 'winston'

import { EventsGateway } from './event.gateway'

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get<string>('redis.host'),
          port: configService.get<string>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          isGlobal: true,
        }
      },
      inject: [ConfigService],
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
    AuthModule,
  ],
  providers: [EventsGateway],
})
export class EventsModule {}
