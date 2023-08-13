import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthModule } from '@security/auth.module'
import * as redisStore from 'cache-manager-ioredis'

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
    AuthModule,
  ],
  providers: [EventsGateway],
})
export class EventsModule {}
