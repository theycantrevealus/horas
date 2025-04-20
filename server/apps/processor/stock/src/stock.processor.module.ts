import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { BullModule, BullRootModuleOptions } from '@nestjs/bull'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthModule } from '@security/auth.module'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaProvider } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'
import * as redisStore from 'cache-manager-ioredis'

import { StockProcessorConsumer } from './stock.processor.consumer'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [ApplicationConfig, MongoConfig, KafkaConfig, RedisConfig],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<BullRootModuleOptions> => {
        if (configService.get<string>('redis.password') !== '') {
          return {
            url: `redis://${configService.get<string>('redis.password')}@${configService.get<string>('redis.host')}:${configService.get<string>('redis.port')}`,
          }
        } else {
          return {
            url: `redis://${configService.get<string>('redis.host')}:${configService.get<string>('redis.port')}`,
          }
        }
      },
      inject: [ConfigService],
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          handleRejections: true,
          handleExceptions: true,
          colorize: configService.get<boolean>('application.log.colorize'),
          transports: WinstonCustomTransports[environmentName],
        }
      },
      inject: [ConfigService],
    }),
    KafkaProvider(
      ['STOCK_SERVICE'],
      [
        {
          configClass: 'kafka.stock',
          producerModeOnly: true,
          schema: [
            {
              topic: 'stock',
              headers: 'stock/movement/header.avsc',
              key: 'global/key.avsc',
              value: 'stock/movement/value.avsc',
            },
          ],
        },
      ]
    ),
    AuthModule,
  ],
  controllers: [],
  providers: [StockProcessorConsumer],
  exports: [],
})
export class StockProcessorModule {}
