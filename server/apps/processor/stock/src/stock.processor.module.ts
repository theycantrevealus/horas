import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig, RedisStock } from '@configuration/redis'
import { GatewayInventoryStockDisposalModule } from '@gateway_inventory/disposal/gateway.inventory.disposal.module'
import { GatewayInventoryStockDisposalService } from '@gateway_inventory/disposal/gateway.inventory.disposal.service'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { BullModule, BullRootModuleOptions } from '@nestjs/bullmq'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { StockDisposal, StockDisposalSchema } from '@schemas/inventory/disposal'
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
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      connectionName: 'primary',
      useFactory: async (
        configService: ConfigService
      ): Promise<MongooseModuleOptions> => ({
        uri: `${configService.get<string>('mongo.primary.uri')}`,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(
      [
        { name: LogLogin.name, schema: LogLoginSchema },
        { name: LogActivity.name, schema: LogActivitySchema },
        { name: StockDisposal.name, schema: StockDisposalSchema },
      ],
      'primary'
    ),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<BullRootModuleOptions> => {
        if (configService.get<string>('redis.password') !== '') {
          return {
            connection: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
              password: configService.get<string>('redis.password'),
            },
          }
        } else {
          return {
            connection: {
              host: configService.get<string>('redis.host'),
              port: +configService.get<number>('redis.port'),
            },
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
    BullModule.registerQueueAsync(RedisStock),
    AuthModule,
    GatewayInventoryStockDisposalModule,
  ],
  controllers: [],
  providers: [
    SocketIoClientProvider,
    SocketIoClientProxyService,
    StockProcessorConsumer,
    GatewayInventoryStockDisposalService,
  ],
  exports: [],
})
export class StockProcessorModule {}
