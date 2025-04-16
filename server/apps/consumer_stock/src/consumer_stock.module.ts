import { ApplicationConfig } from '@configuration/environtment'
import { KafkaConfig } from '@configuration/kafka'
import { MongoConfig } from '@configuration/mongo'
import { RedisConfig } from '@configuration/redis'
import { SocketConfig } from '@configuration/socket'
import { SocketIoClientProvider } from '@gateway_socket/socket.provider'
import { SocketIoClientProxyService } from '@gateway_socket/socket.proxy'
import { LogActivity, LogActivitySchema } from '@log/schemas/log.activity'
import { LogLogin, LogLoginSchema } from '@log/schemas/log.login'
import { CacheModule } from '@nestjs/cache-manager'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose'
import { InventoryStock, InventoryStockSchema } from '@schemas/inventory/stock'
import {
  InventoryStockLog,
  InventoryStockLogSchema,
} from '@schemas/inventory/stock.log'
import { MongoMiddlewareInventoryStockLog } from '@schemas/inventory/stock.log.middleware'
import { MongoMiddlewareInventoryStock } from '@schemas/inventory/stock.middleware'
import {
  MasterStockPoint,
  MasterStockPointSchema,
} from '@schemas/master/master.stock.point'
import { AuthService } from '@security/auth.service'
import { DecoratorProcessorService } from '@utility/decorator'
import { environmentIdentifier, environmentName } from '@utility/environtment'
import { KafkaProvider } from '@utility/kafka'
import { WinstonModule } from '@utility/logger/module'
import { WinstonCustomTransports } from '@utility/transport.winston'
import * as redisStore from 'cache-manager-ioredis'

import { ConsumerStockController } from './consumer_stock.controller'
import { ConsumerStockService } from './consumer_stock.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: environmentIdentifier,
      load: [
        ApplicationConfig,
        MongoConfig,
        KafkaConfig,
        SocketConfig,
        RedisConfig,
      ],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('redis.host'),
        port: configService.get<string>('redis.port'),
        username: configService.get<string>('redis.username'),
        password: configService.get<string>('redis.password'),
        isGlobal: true,
      }),
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

        { name: MasterStockPoint.name, schema: MasterStockPointSchema },

        { name: InventoryStock.name, schema: InventoryStockSchema },
        { name: InventoryStockLog.name, schema: InventoryStockLogSchema },
      ],
      'primary'
    ),
    KafkaProvider(
      ['STOCK_SERVICE'],
      [
        {
          configClass: 'kafka.stock',
          producerModeOnly: false,
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
  ],
  controllers: [ConsumerStockController],
  providers: [
    JwtService,
    AuthService,
    DecoratorProcessorService,
    SocketIoClientProvider,
    SocketIoClientProxyService,
    ConsumerStockService,

    MongoMiddlewareInventoryStock,
    MongoMiddlewareInventoryStockLog,
  ],
  exports: [ConsumerStockService],
})
export class ConsumerStockModule {}
